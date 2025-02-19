export function analyzeGameState(state) {
    const analysis = {
        isGameActive: false,
        currentPhase: null,
        availableActions: [],
        playerCount: 0,
        potSize: 0,
        communityCards: [],
        errors: []
    };
    
    try {
        // Check if game is active
        analysis.isGameActive = state.hasGameTable && 
            (state.cards.length > 0 || state.players.length > 0);
        
        // Count players
        analysis.playerCount = state.players ? state.players.length : 0;
        
        // Determine game phase based on visible elements
        if (state.gameState) {
            if (state.gameState.hasStartButton) {
                analysis.currentPhase = 'PRE_GAME';
            } else if (state.gameState.hasJoinButton) {
                analysis.currentPhase = 'WAITING_FOR_PLAYERS';
            } else if (state.gameState.hasActionButtons) {
                analysis.currentPhase = 'IN_PROGRESS';
            } else if (state.gameState.hasLeaveButton) {
                analysis.currentPhase = 'GAME_OVER';
            }
        }
        
        // Collect available actions
        if (state.buttons) {
            analysis.availableActions = state.buttons
                .filter(b => b.visible && !b.disabled)
                .map(b => ({
                    type: b.text,
                    position: b.position
                }));
        }
        
        // Check for errors
        if (state.errors && state.errors.length > 0) {
            analysis.errors = state.errors.map(e => e.text);
        }
        
    } catch (error) {
        analysis.errors.push(`Analysis failed: ${error.message}`);
    }
    
    return analysis;
} 