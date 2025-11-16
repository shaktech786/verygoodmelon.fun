import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '')

interface GitHubIssue {
  title: string
  body: string
  labels: string[]
}

async function analyzeFeedbackWithAI(feedback: string): Promise<GitHubIssue> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    generationConfig: {
      temperature: 0.2
    }
  })

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
${feedback.toLowerCase().includes("doesn't work") || feedback.toLowerCase().includes("not working") || feedback.toLowerCase().includes("broken") ? `
1. [Infer step 1]
2. [Infer step 2]
3. [Observe the issue]
` : `
[Not applicable - this is not a bug report]
`}

## Expected Behavior
[What should happen]

## Actual Behavior
${feedback.toLowerCase().includes("doesn't work") || feedback.toLowerCase().includes("not working") || feedback.toLowerCase().includes("broken") ? `
[What currently happens based on feedback]
` : `
[Not applicable - this is not a bug report]
`}

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
    const result = await model.generateContent(prompt)
    const response = result.response.text()

    console.log('AI Response:', response) // Debug log

    // Parse JSON (should be direct JSON now with responseMimeType)
    let issueData
    try {
      issueData = JSON.parse(response)
    } catch (parseError) {
      // Try extracting from code blocks if direct parse fails
      const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
      if (jsonMatch) {
        issueData = JSON.parse(jsonMatch[1])
      } else {
        throw new Error('Could not parse AI response as JSON')
      }
    }

    // Validate the response
    if (!issueData.title || !issueData.body || !Array.isArray(issueData.labels)) {
      throw new Error('Invalid AI response format')
    }

    // Add user-submitted label if not present
    if (!issueData.labels.includes('user-submitted')) {
      issueData.labels.push('user-submitted')
    }

    // Ensure body ends with the automated message
    if (!issueData.body.includes('automatically created from user feedback')) {
      issueData.body += '\n\n---\n\n*This issue was automatically created from user feedback.*'
    }

    console.log('Parsed issue data:', issueData) // Debug log

    return issueData
  } catch (error) {
    console.error('AI analysis failed:', error)

    // Enhanced fallback with basic structure
    const isBug = feedback.toLowerCase().includes("doesn't work") ||
                  feedback.toLowerCase().includes("not working") ||
                  feedback.toLowerCase().includes("broken") ||
                  feedback.toLowerCase().includes("error")

    const title = feedback.length > 60
      ? feedback.slice(0, 60).trim() + '...'
      : feedback.trim()

    return {
      title: title,
      body: `## User Feedback\n\n${feedback}\n\n## Issue Type\n\nThis appears to be a ${isBug ? 'bug report' : 'feature request or question'}.\n\n## Next Steps\n\n- [ ] Investigate the issue\n- [ ] Reproduce if it's a bug\n- [ ] Determine priority\n- [ ] Assign to appropriate milestone\n\n---\n\n*This issue was automatically created from user feedback. AI analysis failed, using basic formatting.*`,
      labels: isBug ? ['bug', 'user-submitted', 'needs-triage'] : ['user-submitted', 'needs-triage']
    }
  }
}

async function createGitHubIssue(issueData: GitHubIssue): Promise<{ url: string; number: number }> {
  const token = process.env.GITHUB_TOKEN
  const owner = 'shaktech786'
  const repo = 'verygoodmelon.fun'

  if (!token) {
    throw new Error('GITHUB_TOKEN not configured')
  }

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
    method: 'POST',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: issueData.title,
      body: issueData.body,
      labels: issueData.labels,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('GitHub API error:', error)
    throw new Error(`Failed to create GitHub issue: ${response.status}`)
  }

  const issue = await response.json()
  return {
    url: issue.html_url,
    number: issue.number
  }
}

export async function POST(request: NextRequest) {
  try {
    const { feedback } = await request.json()

    if (!feedback || typeof feedback !== 'string' || feedback.trim().length === 0) {
      return NextResponse.json(
        { error: 'Feedback is required' },
        { status: 400 }
      )
    }

    // Analyze feedback with AI
    const issueData = await analyzeFeedbackWithAI(feedback)

    // Create GitHub issue
    const { url, number } = await createGitHubIssue(issueData)

    return NextResponse.json({
      success: true,
      issueUrl: url,
      issueNumber: number,
      message: 'Thank you for your feedback! We\'ve created a GitHub issue to track this.'
    })
  } catch (error) {
    console.error('Feedback submission error:', error)
    return NextResponse.json(
      { error: 'Failed to submit feedback. Please try again later.' },
      { status: 500 }
    )
  }
}
