"use client";

import React, { useState, useMemo, useCallback } from "react";
import { parseEther, Interface } from "ethers";
import { Button } from "./DemoComponents";
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
  userAddress: string | null;
};

export const Home: React.FC<HomeProps> = ({
  setActiveTab,
  onPostPrediction,
  predictions,
  userAddress,
}) => {
  const [newPrediction, setNewPrediction] = useState("");
  const [stakeAmounts, setStakeAmounts] = useState<{ [key: number]: string }>({});

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
    setStakeAmounts({});
  }, []);

  const handleError = useCallback((error: TransactionError) => {
    console.error("Transaction failed:", error);
    alert("Failed to stake. Please try again.");
  }, []);

  const contractInterface = useMemo(() => new Interface(AlphaLensABI.abi), []);

  // For staking
  const generateCalls = (predictionId: number, agree: boolean) => {
    const stakeAmount = stakeAmounts[predictionId];
    if (
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

  // For resolving prediction (no value needed)
  const generateResolveCalls = (predictionId: number, outcome: boolean) => {
    const data = contractInterface.encodeFunctionData("resolvePrediction", [predictionId, outcome]) as `0x${string}`;
    return [
      {
        to: contractAddress,
        data,
      },
    ];
  };

  const handleStakeAmountChange = (predictionId: number, value: string) => {
    // Allow only numbers and a single decimal point
    if (/^\d*\.?\d*$/.test(value)) {
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
                  {/* Stake input and buttons above resolve buttons */}
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
                    <Transaction
                      calls={generateResolveCalls(prediction.id, true)}
                      onSuccess={handleSuccess}
                      onError={handleError}
                    >
                      <Button className="text-green-500">
                        Resolve as Correct
                      </Button>
                    </Transaction>
                    <Transaction
                      calls={generateResolveCalls(prediction.id, false)}
                      onSuccess={handleSuccess}
                      onError={handleError}
                    >
                      <Button className="text-red-500">
                        Resolve as Incorrect
                      </Button>
                    </Transaction>
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