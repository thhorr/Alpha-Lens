// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AlphaLens {
    struct Prediction {
        address creator;
        string text;
        uint256 agrees;
        uint256 disagrees;
        uint256 totalStake;
        bool resolved; // Whether the prediction has been resolved
        bool outcome; // The outcome of the prediction (true = correct, false = incorrect)
        mapping(address => uint256) agreeStakes; // Tracks stakes for "Agree"
        mapping(address => uint256) disagreeStakes; // Tracks stakes for "Disagree"
    }

    Prediction[] public predictions;
    mapping(address => uint256) public reputation; // Tracks user reputation based on successful predictions

    event PredictionPosted(uint256 indexed predictionId, address indexed creator, string text);
    event Staked(uint256 indexed predictionId, address indexed staker, bool agree, uint256 amount);
    event PredictionResolved(uint256 indexed predictionId, bool outcome);

    /**
     * @dev Post a new prediction.
     * @param _text The text of the prediction.
     */
    function postPrediction(string memory _text) external {
        Prediction storage newPrediction = predictions.push();
        newPrediction.creator = msg.sender;
        newPrediction.text = _text;
        newPrediction.agrees = 0;
        newPrediction.disagrees = 0;
        newPrediction.totalStake = 0;
        newPrediction.resolved = false;

        emit PredictionPosted(predictions.length - 1, msg.sender, _text);
    }

    /**
     * @dev Stake ETH to agree or disagree with a prediction.
     * @param _predictionId The ID of the prediction.
     * @param _agree True if staking to agree, false if staking to disagree.
     */
    function stake(uint256 _predictionId, bool _agree) external payable {
        require(_predictionId < predictions.length, "Invalid prediction ID");
        require(msg.value > 0, "Stake amount must be greater than 0");

        Prediction storage prediction = predictions[_predictionId];
        require(!prediction.resolved, "Prediction already resolved");

        if (_agree) {
            prediction.agrees++;
            prediction.agreeStakes[msg.sender] += msg.value;
        } else {
            prediction.disagrees++;
            prediction.disagreeStakes[msg.sender] += msg.value;
        }

        prediction.totalStake += msg.value;

        emit Staked(_predictionId, msg.sender, _agree, msg.value);
    }

    /**
     * @dev Resolve a prediction and distribute rewards.
     * @param _predictionId The ID of the prediction.
     * @param _outcome The outcome of the prediction (true = correct, false = incorrect).
     */
    function resolvePrediction(uint256 _predictionId, bool _outcome) external {
        require(_predictionId < predictions.length, "Invalid prediction ID");

        Prediction storage prediction = predictions[_predictionId];
        require(!prediction.resolved, "Prediction already resolved");
        require(msg.sender == prediction.creator, "Only the creator can resolve the prediction");

        prediction.resolved = true;
        prediction.outcome = _outcome;

        uint256 rewardPool = prediction.totalStake;
        uint256 winningStake = _outcome ? prediction.agrees : prediction.disagrees;

        if (winningStake > 0) {
            // Distribute rewards to the winning side
            if (_outcome) {
                for (uint256 i = 0; i < predictions.length; i++) {
                    address staker = address(uint160(i)); // Iterate over stakers
                    uint256 stake = prediction.agreeStakes[staker];
                    if (stake > 0) {
                        uint256 reward = (stake * rewardPool) / prediction.agrees;
                        payable(staker).transfer(reward);
                    }
                }
            } else {
                for (uint256 i = 0; i < predictions.length; i++) {
                    address staker = address(uint160(i)); // Iterate over stakers
                    uint256 stake = prediction.disagreeStakes[staker];
                    if (stake > 0) {
                        uint256 reward = (stake * rewardPool) / prediction.disagrees;
                        payable(staker).transfer(reward);
                    }
                }
            }
        }

        // Update reputation for the creator
        if (_outcome) {
            reputation[prediction.creator] += 10; // Add reputation for a correct prediction
        } else {
            reputation[prediction.creator] -= 5; // Penalize for an incorrect prediction
        }

        emit PredictionResolved(_predictionId, _outcome);
    }

    /**
     * @dev Get details of a prediction.
     * @param _predictionId The ID of the prediction.
     * @return creator The address of the prediction creator.
     * @return text The text of the prediction.
     * @return agrees The number of agreements.
     * @return disagrees The number of disagreements.
     * @return totalStake The total amount of ETH staked on the prediction.
     * @return resolved Whether the prediction has been resolved.
     * @return outcome The outcome of the prediction.
     */
    function getPrediction(uint256 _predictionId)
        external
        view
        returns (
            address creator,
            string memory text,
            uint256 agrees,
            uint256 disagrees,
            uint256 totalStake,
            bool resolved,
            bool outcome
        )
    {
        require(_predictionId < predictions.length, "Invalid prediction ID");

        Prediction storage prediction = predictions[_predictionId];
        return (
            prediction.creator,
            prediction.text,
            prediction.agrees,
            prediction.disagrees,
            prediction.totalStake,
            prediction.resolved,
            prediction.outcome
        );
    }
}