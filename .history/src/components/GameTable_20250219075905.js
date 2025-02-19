import React from 'react';
import PropTypes from 'prop-types';
import '../styles/GameTable.css';

const GameTable = ({ gameState, players, onAction }) => {
    // Validate required props
    if (!gameState) {
        console.error('GameTable: gameState prop is required');
        return <div className="game-table-container error">Loading game state...</div>;
    }

    if (!Array.isArray(players)) {
        console.error('GameTable: players prop must be an array');
        return <div className="game-table-container error">Loading players...</div>;
    }

    if (typeof onAction !== 'function') {
        console.error('GameTable: onAction prop must be a function');
        return <div className="game-table-container error">Initializing game actions...</div>;
    }

    const {
        phase,
        potSize,
        currentBet,
        activePlayer,
        communityCards,
        availableActions
    } = gameState;

    // Validate game state properties
    const isValidGameState = phase && typeof potSize === 'number' && typeof currentBet === 'number';
    if (!isValidGameState) {
        console.error('GameTable: Invalid game state properties', { phase, potSize, currentBet });
        return <div className="game-table-container error">Validating game state...</div>;
    }

    return (
        <div className="game-table-container" data-testid="game-table">
            <div className="game-info">
                <div className="game-phase">{phase}</div>
                <div className="pot-size">Pot: ${potSize}</div>
                <div className="current-bet">Current Bet: ${currentBet}</div>
            </div>

            <div className="community-cards">
                {Array.isArray(communityCards) && communityCards.map((card, index) => (
                    <div key={index} className="card" data-testid={`community-card-${index}`}>
                        {card.rank}{card.suit}
                    </div>
                ))}
            </div>

            <div className="player-positions">
                {players.map((player, index) => (
                    <div 
                        key={index} 
                        className={`player-position ${activePlayer === player.id ? 'active' : ''}`}
                        data-testid={`player-${index}`}
                    >
                        <div className="player-name">{player.name}</div>
                        <div className="player-stack">${player.stack}</div>
                        {player.bet > 0 && (
                            <div className="player-bet">${player.bet}</div>
                        )}
                        {Array.isArray(player.cards) && player.cards.map((card, cardIndex) => (
                            <div key={cardIndex} className="card" data-testid={`player-${index}-card-${cardIndex}`}>
                                {card.rank}{card.suit}
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {Array.isArray(availableActions) && availableActions.length > 0 && (
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

GameTable.propTypes = {
    gameState: PropTypes.shape({
        phase: PropTypes.string.isRequired,
        potSize: PropTypes.number.isRequired,
        currentBet: PropTypes.number.isRequired,
        activePlayer: PropTypes.string,
        communityCards: PropTypes.arrayOf(
            PropTypes.shape({
                rank: PropTypes.string.isRequired,
                suit: PropTypes.string.isRequired
            })
        ),
        availableActions: PropTypes.arrayOf(
            PropTypes.shape({
                type: PropTypes.string.isRequired,
                amount: PropTypes.number
            })
        )
    }).isRequired,
    players: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.string.isRequired,
            name: PropTypes.string.isRequired,
            stack: PropTypes.number.isRequired,
            bet: PropTypes.number,
            cards: PropTypes.arrayOf(
                PropTypes.shape({
                    rank: PropTypes.string.isRequired,
                    suit: PropTypes.string.isRequired
                })
            )
        })
    ).isRequired,
    onAction: PropTypes.func.isRequired
};

export default GameTable; 