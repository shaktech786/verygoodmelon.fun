import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '')

interface GitHubIssue {
  title: string
  body: string
  labels: string[]
}

async function analyzeFeedbackWithAI(feedback: string): Promise<GitHubIssue> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

  const prompt = `You are a helpful assistant that analyzes user feedback and converts it into well-structured GitHub issues.

User Feedback:
"""
${feedback}
"""

Analyze this feedback and create a GitHub issue with:
1. A clear, concise title (max 80 characters)
2. A well-formatted body with:
   - Summary of the issue
   - Steps to reproduce (if it's a bug)
   - Expected behavior
   - Actual behavior (if it's a bug)
   - Additional context
3. Appropriate labels from: ["bug", "enhancement", "question", "documentation", "good first issue", "help wanted", "accessibility", "performance", "ui/ux"]

Determine if this is:
- A bug report (use "bug" label)
- A feature request (use "enhancement" label)
- A question (use "question" label)
- Feedback about UI/UX (use "ui/ux" label)
- Accessibility issue (use "accessibility" label)
- Performance issue (use "performance" label)

Return ONLY a valid JSON object with this exact structure:
{
  "title": "Clear title here",
  "body": "Well-formatted markdown body here",
  "labels": ["label1", "label2"]
}

Make the issue professional, clear, and actionable. Add context where helpful. If the feedback is vague, make reasonable assumptions but note them in the body.`

  try {
    const result = await model.generateContent(prompt)
    const response = result.response.text()

    // Extract JSON from markdown code blocks if present
    let jsonText = response
    const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
    if (jsonMatch) {
      jsonText = jsonMatch[1]
    }

    const issueData = JSON.parse(jsonText)

    // Validate the response
    if (!issueData.title || !issueData.body || !Array.isArray(issueData.labels)) {
      throw new Error('Invalid AI response format')
    }

    // Add user-submitted label
    if (!issueData.labels.includes('user-submitted')) {
      issueData.labels.push('user-submitted')
    }

    return issueData
  } catch (error) {
    console.error('AI analysis failed:', error)

    // Fallback to basic formatting
    return {
      title: feedback.slice(0, 80).trim() + (feedback.length > 80 ? '...' : ''),
      body: `## User Feedback\n\n${feedback}\n\n---\n\n*This issue was automatically created from user feedback.*`,
      labels: ['user-submitted', 'needs-triage']
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
