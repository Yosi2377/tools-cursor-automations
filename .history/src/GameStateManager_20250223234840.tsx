import { initialGameState } from '@/utils/gameInitializer';

// ... existing code ...
communityCards: game.community_cards ? JSON.parse(game.community_cards) as Card[] : [],

// ... existing code ...
const gameChannel = supabase.channel(`game:${String(game.id)}`);
// ... existing code ... 