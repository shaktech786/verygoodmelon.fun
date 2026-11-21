import { createCommunityWordsHandlers } from '@/lib/games/community-words/server'

export const { GET, POST } = createCommunityWordsHandlers('first_words')
