"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { parseEther, Interface } from "ethers";
import { Button } from "./DemoComponents";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import {
  Transaction,
  TransactionResponse,
  TransactionError,
} from "@coinbase/onchainkit/transaction";
import AlphaLensABI from "../../backend/artifacts/contracts/AlphaLens.sol/AlphaLens.json";

const contractAddress: `0x${string}` = "0x8E7E1639B1aE8889abFF319b815a3440c494aaC9"; // Replace with your valid deployed contract address

type HomeProps = {
  setActiveTab: (tab: string) => void;
  onPostPrediction: (prediction: { id: number; text: string; agrees: number; disagrees: number }) => void;
  predictions: Array<{
    id: number;
    text: string;
    agrees: number;
    disagrees: number;
    totalStake?: number;
    resolved?: boolean;
    outcome?: boolean;
    creator?: string;
  }>;
};

export const Home: React.FC<HomeProps> = ({ setActiveTab, onPostPrediction, predictions }) => {
  const [newPrediction, setNewPrediction] = useState("");
  const [stakeAmounts, setStakeAmounts] = useState<{ [key: number]: string }>({}); // Track stake amounts for each prediction
  const { context } = useMiniKit(); // Access OnchainKit context
  const [userAddress, setUserAddress] = useState<string | null>(null);
  console.log("Context:", context);

  useEffect(() => {
    if (context && "address" in context && typeof context.address === "string" && context.address) {
      setUserAddress(context.address.toLowerCase());
    }
  }, [context]);

  const handlePost = () => {
    if (newPrediction.trim()) {
      onPostPrediction({
        id: Date.now(),
        text: newPrediction,
        agrees: 0,
        disagrees: 0,
      });
      setNewPrediction("");
    }
  };

  const handleSuccess = useCallback(async (response: TransactionResponse) => {
    const transactionHash = response.transactionReceipts[0].transactionHash;
    console.log(`Transaction successful: ${transactionHash}`);
    alert("Stake successful!");
    setStakeAmounts({}); // Reset stake amounts after successful transaction
  }, []);

  const handleError = useCallback((error: TransactionError) => {
    console.error("Transaction failed:", error);
    alert("Failed to stake. Please try again.");
  }, []);

  const resolvePrediction = async (predictionId: number, outcome: boolean) => {
    try {
      const { ethers } = require("ethers");
      if (!context || !("signer" in context) || !context.signer) {
        alert("Context or signer is not available. Please connect your wallet.");
        return;
      }
      const contract = new ethers.Contract(contractAddress, AlphaLensABI.abi, context.signer);
      const tx = await contract.resolvePrediction(predictionId, outcome);
      await tx.wait();

      alert("Prediction resolved successfully! Rewards have been distributed to the winning stakers.");
    } catch (error) {
      console.error("Error resolving prediction:", error);
      alert("Failed to resolve prediction.");
    }
  };

  const contractInterface = useMemo(() => new Interface(AlphaLensABI.abi), []);

  const generateCalls = (predictionId: number, agree: boolean) => {
  const stakeAmount = stakeAmounts[predictionId];
  if (
    !context ||
    !stakeAmount ||
    isNaN(Number(stakeAmount)) ||
    Number(stakeAmount) < 0.01
  ) {
    return [];
  }
  const data = contractInterface.encodeFunctionData("stake", [predictionId, agree]) as `0x${string}`;
  return [
    {
      to: contractAddress,
      data,
      value: BigInt(parseEther(stakeAmount).toString()),
    },
  ];
};

  const handleStakeAmountChange = (predictionId: number, value: string) => {
  // Allow only numbers and a single decimal point
  if (/^\d*\.?\d*$/.test(value)) {
    // Allow empty string (for clearing), or any valid number input
    setStakeAmounts((prev) => ({
      ...prev,
      [predictionId]: value,
    }));
  }
};

// Handler to delete a prediction (calls parent via custom event)
  const handleDelete = (predictionId: number) => {
    if (typeof window !== "undefined") {
      const event = new CustomEvent("deletePrediction", { detail: { predictionId } });
      window.dispatchEvent(event);
    }
  };

  return (
  <div className="space-y-4">
    <div className="flex flex-col space-y-2">
      <textarea
        value={newPrediction}
        onChange={(e) => setNewPrediction(e.target.value)}
        placeholder="Post your onchain insight, prediction, or token call..."
        className="w-full p-2 border rounded-md"
      />
      <Button onClick={handlePost} className="self-end">
        Post Prediction
      </Button>
    </div>

    <div className="space-y-4">
      {predictions.map((prediction) => {
        // Only show delete button if the connected user is the creator
        const isCreator =
          userAddress &&
          prediction.creator &&
          userAddress === prediction.creator.toLowerCase();

        return (
          <div
            key={prediction.id}
            className="p-4 border rounded-md shadow-sm space-y-2 relative"
          >
            {isCreator && (
              <button
                onClick={() => handleDelete(prediction.id)}
                className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold"
                title="Delete Prediction"
              >
                &#10005;
              </button>
            )}
            <p>{prediction.text}</p>
            <p>Agrees: {prediction.agrees}</p>
            <p>Disagrees: {prediction.disagrees}</p>
            <p>Total Stake: {prediction.totalStake || 0} ETH</p>
            {prediction.resolved ? (
              <>
                <p>Outcome: {prediction.outcome ? "Correct" : "Incorrect"}</p>
                <p>Rewards have been distributed to the winning stakers.</p>
              </>
            ) : (
              <>
                {/* Stake input and buttons moved above resolve buttons */}
                <div className="flex items-center space-x-2 mb-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="^\d*\.?\d*$"
                    value={stakeAmounts[prediction.id] || ""}
                    onChange={(e) => handleStakeAmountChange(prediction.id, e.target.value)}
                    placeholder="Stake amount (ETH)"
                    className="p-2 border rounded-md flex-1"
                  />
                  <Transaction
                    calls={generateCalls(prediction.id, true)}
                    onSuccess={handleSuccess}
                    onError={handleError}
                  >
                    <button className="text-green-500">Stake Agree</button>
                  </Transaction>
                  <Transaction
                    calls={generateCalls(prediction.id, false)}
                    onSuccess={handleSuccess}
                    onError={handleError}
                  >
                    <button className="text-red-500">Stake Disagree</button>
                  </Transaction>
                </div>
                <div className="flex space-x-4">
                  <Button onClick={() => resolvePrediction(prediction.id, true)} className="text-green-500">
                    Resolve as Correct
                  </Button>
                  <Button onClick={() => resolvePrediction(prediction.id, false)} className="text-red-500">
                    Resolve as Incorrect
                  </Button>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  </div>
);
};

