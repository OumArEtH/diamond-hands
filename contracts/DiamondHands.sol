//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

contract DiamondHands {
    uint256 private constant TWO_YEARS = 2 * 365;
    
    mapping(address => uint256) public timeLock;
    mapping(address => uint256) public balances;

    event Deposit(address indexed depositor, uint256 amount, uint256 lockExpiry);
    event Withdraw(address indexed withdrawer, uint256 amount);
    
    function depositEth() public payable {
        require(msg.value > 0, "You can only deposit non-zero amounts");
        // first deposit
        if(balances[msg.sender] == 0) {
            balances[msg.sender] = msg.value;
        } else {
            // user already made a deposit
            balances[msg.sender] += msg.value;
        }
        // update timeLock regardless
        uint256 _lockExpiry = _addDays(TWO_YEARS);
        timeLock[msg.sender] = _lockExpiry;
        
        emit Deposit(msg.sender, msg.value, _lockExpiry);
    }
    
    function withdraw() public {
        require(balances[msg.sender] > 0, "You never deposited funds here!");
        require(block.timestamp >= timeLock[msg.sender], "Not allowed yet! You need diamond hands my friend");
        
        //prevent re-entrancy attack
        uint256 _withdrawalAmount = balances[msg.sender];
        balances[msg.sender] = 0;
        timeLock[msg.sender] = 0;
        
        //make the transfer
        (bool success, ) = msg.sender.call{value: _withdrawalAmount}("");
        require(success, "Failed to withdraw funds");
        
        emit Withdraw(msg.sender, _withdrawalAmount);
    }
    
    function _addDays(uint256 _numberOfDays) internal view returns (uint256) {
        return block.timestamp + (_numberOfDays * 1 days);
    }
}