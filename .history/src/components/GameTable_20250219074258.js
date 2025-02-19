import React from 'react';
import '../styles/GameTable.css';

const GameTable = ({ gameState, players, onAction }) => {
    const {
        phase,
        potSize,
        currentBet,
        activePlayer,
        communityCards,
        availableActions
    } = gameState;

    return (
        <div className="game-table-container">
            <div className="game-info">
                <div className="game-phase">{phase || 'Waiting...'}</div>
                <div className="pot-size">Pot: ${potSize || 0}</div>
                <div className="current-bet">Current Bet: ${currentBet || 0}</div>
            </div>

            <div className="community-cards">
                {communityCards?.map((card, index) => (
                    <div key={index} className="card">
                        {card.rank}{card.suit}
                    </div>
                ))}
            </div>

            <div className="player-positions">
                {players?.map((player, index) => (
                    <div 
                        key={index} 
                        className={`player-position ${activePlayer === player.id ? 'active' : ''}`}
                        data-testid="player"
                    >
                        <div className="player-name">{player.name}</div>
                        <div className="player-stack">${player.stack}</div>
                        {player.bet > 0 && (
                            <div className="player-bet">${player.bet}</div>
                        )}
                        {player.cards?.map((card, cardIndex) => (
                            <div key={cardIndex} className="card">
                                {card.rank}{card.suit}
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {availableActions?.length > 0 && (
                <div className="action-buttons">
                    {availableActions.map((action, index) => (
                        <button
                            key={index}
                            className="action-button"
                            onClick={() => onAction(action)}
                            data-testid={`action-${action.type}`}
                        >
                            {action.type} {action.amount ? `$${action.amount}` : ''}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default GameTable; 