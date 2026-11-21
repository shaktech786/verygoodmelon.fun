import { createCommunityWordsHandlers } from '@/lib/games/community-words/server'

export const { GET, POST } = createCommunityWordsHandlers('last_words')
