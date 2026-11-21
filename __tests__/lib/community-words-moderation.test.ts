import { describe, it, expect } from 'vitest'
import {
  moderateSubmission,
  isCloudSafeWord,
  soundsLikeDistress,
  MAX_SUBMISSION_LENGTH,
} from '@/lib/games/community-words/moderation'

describe('moderateSubmission', () => {
  it('accepts heartfelt words and trims them', () => {
    expect(moderateSubmission('  Thank you for the ordinary days.  ')).toEqual({
      ok: true,
      words: 'Thank you for the ordinary days.',
    })
  })

  it('accepts words in any script, emoji and markup-looking text', () => {
    for (const words of ['Спасибо за всё', 'ありがとう 🍉', '<script>alert(1)</script> remember me']) {
      expect(moderateSubmission(words).ok).toBe(true)
    }
  })

  it('rejects empty and over-long text', () => {
    expect(moderateSubmission('   \n ')).toEqual({ ok: false, reason: 'empty' })
    expect(moderateSubmission('a'.repeat(MAX_SUBMISSION_LENGTH + 1))).toEqual({ ok: false, reason: 'too-long' })
    expect(moderateSubmission('a'.repeat(MAX_SUBMISSION_LENGTH)).ok).toBe(true)
  })

  it('rejects slurs and harassment', () => {
    for (const words of ['you are all faggots', 'kill yourself', 'kys loser', 'heil hitler', 'stupid retard']) {
      expect(moderateSubmission(words)).toEqual({ ok: false, reason: 'abusive' })
    }
  })

  it('sees through common disguises', () => {
    for (const words of ['f a g g o t', 'f.a.g.g.o.t', 'FaGg0t', 'k y s', 'n1gg3r', 'faaaggot', 'ｆａｇｇｏｔ', 'fäggot']) {
      expect(moderateSubmission(words)).toEqual({ ok: false, reason: 'abusive' })
    }
  })

  it('rejects links, emails, handles and phone numbers', () => {
    for (const words of [
      'visit https://spam.example',
      'go to www.example.com now',
      'cheap-pills.ru',
      'write me at someone@example.com',
      'follow @someone_here',
      'call 555 123 4567',
      'discord.gg/abcdef',
    ]) {
      expect(moderateSubmission(words)).toEqual({ ok: false, reason: 'contact' })
    }
  })

  it('does not trip on innocent words that contain a blocked word', () => {
    for (const words of [
      'I sniggered at the funeral and Grandma would have too',
      'Pass the class, assess the glass, as always',
      'Scunthorpe was home',
      'I will see you in hell, Dad, and we will laugh about it',
      'Mr. Dickens wrote it best',
      'Shiitake mushrooms forever',
      'I was born in 1988',
      'It is 3:15 and I am at peace',
    ]) {
      expect(moderateSubmission(words)).toEqual({ ok: true, words })
    }
  })

  it('lets everyday swearing through: it is kept out of the cloud instead', () => {
    expect(moderateSubmission('Fuck cancer. I love you, Mum.').ok).toBe(true)
  })
})

describe('isCloudSafeWord', () => {
  it('keeps ordinary words', () => {
    for (const word of ['love', 'hell', 'goodbye', 'спасибо', 'pass', 'dickens']) {
      expect(isCloudSafeWord(word)).toBe(true)
    }
  })

  it('keeps words of self-harm and dying out of the shared cloud', () => {
    for (const word of ['kill', 'killed', 'killing', 'suicide', 'suicidal', 'pills', 'overdose', 'die', 'died', 'dying', 'dead', 'death', 'noose']) {
      expect(isCloudSafeWord(word)).toBe(false)
    }
  })

  it('does not hide ordinary words that contain one of those', () => {
    for (const word of ['skill', 'diet', 'deadline', 'pillow', 'studied', 'goodbye']) {
      expect(isCloudSafeWord(word)).toBe(true)
    }
  })

  it('keeps swearing and abuse out of the shared cloud', () => {
    for (const word of ['fuck', 'fucking', 'shit', 'sh1t', 'faggot', 'faggots', 'cunt']) {
      expect(isCloudSafeWord(word)).toBe(false)
    }
  })
})

describe('soundsLikeDistress', () => {
  it('notices words that sound like someone may be in danger', () => {
    for (const words of [
      'I want to kill myself',
      'I am going to end my life tonight',
      'everyone is better off without me',
      'I have been thinking about suicide',
      'I just want to die',
      "I don't want to be here anymore",
    ]) {
      expect(soundsLikeDistress(words)).toBe(true)
    }
  })

  it('notices danger said indirectly, as people in crisis often say it', () => {
    for (const words of [
      "Finally. I'm so tired. I hope it's over for good this time, I don't want to go back.",
      "Honestly nobody would even notice if I was gone. I can't keep doing this.",
      'I wish I had never been born',
      "I can't go on anymore",
      'there is no way out for me',
      'I am tired of living',
      'everyone would be better off if I disappeared',
      'nobody would miss me',
      'I just want it all to be over',
      'I wish I could sleep and never wake up',
      'I am going to take all my pills tonight',
      'I just want to end it',
    ]) {
      expect(soundsLikeDistress(words)).toBe(true)
    }
  })

  it('stays quiet for ordinary reflections on death', () => {
    for (const words of [
      'I want to die surrounded by the people I love',
      'Thank you for the ordinary days',
      'Do not be afraid of dying, it is part of living',
      'I hope I die peacefully in my sleep',
      'Remember to take your pills, Dad, and look after Mum',
      'I want to end it on a happy note: thank you, all of you',
    ]) {
      expect(soundsLikeDistress(words)).toBe(false)
    }
  })
})
