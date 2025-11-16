import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '')

async function testAI() {
  const model = genAI.getGenerativeModel({
    model: process.env.GOOGLE_GEMINI_MODEL || 'gemini-1.5-flash',
    generationConfig: {
      temperature: 0.2
    }
  })

  const feedback = "The dark mode button doesn't work on my phone"

  const prompt = `Analyze this user feedback and create a structured GitHub issue.

USER FEEDBACK: "${feedback}"

Create a GitHub issue following this template exactly:

TITLE (max 60 chars, be specific):
[Write a clear title]

BODY (use markdown):
## Summary
[One sentence overview]

## Description
[Detailed explanation of what the user reported]

## Steps to Reproduce
1. [Infer step 1]
2. [Infer step 2]
3. [Observe the issue]

## Expected Behavior
[What should happen]

## Actual Behavior
[What currently happens based on feedback]

## Additional Context
[Any assumptions, notes, or relevant info]

## Original User Feedback
> ${feedback}

LABELS (choose 2-3):
Options: bug, enhancement, question, ui/ux, accessibility, performance, documentation
[List your chosen labels]

---

NOW: Return your response as valid JSON with this EXACT structure (no markdown, just raw JSON):
{"title": "your title", "body": "your full markdown body", "labels": ["label1", "label2"]}`

  try {
    console.log('Sending prompt to AI...\n')
    const result = await model.generateContent(prompt)
    const response = result.response.text()

    console.log('RAW AI RESPONSE:')
    console.log('=' .repeat(80))
    console.log(response)
    console.log('=' .repeat(80))

    // Try to parse
    let issueData
    try {
      issueData = JSON.parse(response)
      console.log('\n✅ Direct JSON parse succeeded!')
      console.log(JSON.stringify(issueData, null, 2))
    } catch (parseError) {
      console.log('\n❌ Direct JSON parse failed, trying code block extraction...')
      const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
      if (jsonMatch) {
        issueData = JSON.parse(jsonMatch[1])
        console.log('✅ Code block extraction succeeded!')
        console.log(JSON.stringify(issueData, null, 2))
      } else {
        console.log('❌ Could not find JSON in response')
      }
    }
  } catch (error) {
    console.error('ERROR:', error.message)
    if (error.response) {
      console.error('Response:', await error.response.text())
    }
  }
}

testAI()
