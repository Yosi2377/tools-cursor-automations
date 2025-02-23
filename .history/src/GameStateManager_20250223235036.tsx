import { initialGameState } from '../utils/gameInitializer';
import { Card } from '@/types/poker';
import { supabase } from '@/integrations/supabase/client';

// ... existing code ...
communityCards: gameContext.communityCards,

// ... existing code ...
const gameChannel = supabase.channel(`game:${String(gameContext.gameId)}`);
// ... existing code ... 