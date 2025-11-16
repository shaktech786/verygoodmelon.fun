# Feedback System Documentation

AI-powered feedback system that automatically converts user feedback into GitHub issues.

---

## Overview

The feedback system allows users to easily report bugs, suggest features, or provide general feedback through a simple side button. Their feedback is automatically analyzed by AI and converted into a well-structured GitHub issue.

---

## Features

- ✅ **Simple Input**: Users just type their feedback - no complex forms
- ✅ **AI Analysis**: Google Gemini 2.0 Flash analyzes feedback and categorizes it
- ✅ **Automatic GitHub Issues**: Creates properly formatted GitHub issues automatically
- ✅ **Smart Labeling**: AI determines appropriate labels (bug, enhancement, accessibility, etc.)
- ✅ **Keyboard Accessible**: Full keyboard support (Cmd+Enter to submit)
- ✅ **Mobile Friendly**: Works great on all devices
- ✅ **Privacy Focused**: No personal data collected (just the feedback text)

---

## User Experience

### How Users Interact

1. **Click the Feedback button** on the right side of the screen
2. **Type their feedback** in a simple text box
3. **Submit** (or press Cmd+Enter / Ctrl+Enter)
4. **Get confirmation** that the issue was created
5. **Track progress** on GitHub (link provided)

### Example User Flow

```
User clicks "Feedback" button
  ↓
Modal opens with textarea
  ↓
User types: "The dark mode toggle doesn't work on mobile"
  ↓
User clicks "Send Feedback" or presses Cmd+Enter
  ↓
AI analyzes: Bug report about dark mode on mobile
  ↓
GitHub issue created with title, description, labels
  ↓
User sees success message with issue link
  ↓
Issue appears at: github.com/shaktech786/verygoodmelon.fun/issues
```

---

## Technical Implementation

### Components

**`FeedbackButton.tsx`**
- Side button with "Feedback" text (rotated)
- Modal with simple textarea
- Success/error states
- Keyboard shortcuts (Cmd+Enter)
- Loading states

**`app/api/feedback/route.ts`**
- POST endpoint for feedback submissions
- AI analysis with Google Gemini
- GitHub API integration
- Error handling and fallbacks

---

## AI Analysis

### What the AI Does

1. **Analyzes the feedback** to determine type (bug, feature, question, etc.)
2. **Creates a clear title** (max 80 characters)
3. **Formats the body** with proper sections:
   - Summary
   - Steps to reproduce (for bugs)
   - Expected behavior
   - Actual behavior
   - Additional context
4. **Assigns labels** based on content:
   - `bug` - Bug reports
   - `enhancement` - Feature requests
   - `question` - Questions
   - `ui/ux` - UI/UX feedback
   - `accessibility` - Accessibility issues
   - `performance` - Performance problems
   - `documentation` - Documentation requests
   - `user-submitted` - Always added to user feedback

### Example AI Transformation

**User Input:**
```
The dark mode button doesn't work when I'm on my phone
```

**AI-Generated Issue:**

**Title:** Dark mode toggle not working on mobile devices

**Body:**
```markdown
## Summary
User reports that the dark mode toggle button is not functional on mobile devices.

## Steps to Reproduce
1. Open the website on a mobile device
2. Attempt to click the dark mode toggle button
3. Observe that the dark mode does not activate

## Expected Behavior
The dark mode toggle should switch the site to dark mode when clicked on mobile devices.

## Actual Behavior
The dark mode toggle does not respond to clicks on mobile devices.

## Additional Context
- Platform: Mobile
- Component: Dark mode toggle button

---

*This issue was automatically created from user feedback.*
```

**Labels:** `bug`, `mobile`, `ui/ux`, `user-submitted`

---

## GitHub Integration

### Setup Required

1. **Create GitHub Personal Access Token**
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Name it: "VeryGoodMelon Feedback System"
   - Select scope: `repo` (full control of private repositories)
   - Generate and copy the token

2. **Add to Environment Variables**
   ```bash
   # In .env.local
   GITHUB_TOKEN=ghp_your_token_here
   ```

3. **Add to Vercel**
   - Go to Vercel dashboard
   - Project settings → Environment Variables
   - Add `GITHUB_TOKEN` with your token
   - Redeploy

### API Endpoint

```
POST /api/feedback
Content-Type: application/json

{
  "feedback": "User's feedback text here"
}
```

**Response (Success):**
```json
{
  "success": true,
  "issueUrl": "https://github.com/shaktech786/verygoodmelon.fun/issues/123",
  "issueNumber": 123,
  "message": "Thank you for your feedback! We've created a GitHub issue to track this."
}
```

**Response (Error):**
```json
{
  "error": "Failed to submit feedback. Please try again later."
}
```

---

## Security Considerations

### What's Safe
- ✅ User feedback is analyzed by AI before creating issues
- ✅ No personal data is collected (no names, emails, etc.)
- ✅ GitHub token is stored securely in environment variables
- ✅ Rate limiting via API route
- ✅ Input validation and sanitization

### Potential Issues
- ⚠️ **Spam**: Users could submit spam feedback
  - Mitigation: Add rate limiting per IP
  - Mitigation: Add simple CAPTCHA if spam becomes a problem
- ⚠️ **Abuse**: Malicious users could create many issues
  - Mitigation: Monitor GitHub issues for abuse
  - Mitigation: GitHub allows closing/deleting issues
- ⚠️ **API Costs**: Many submissions could increase AI API costs
  - Mitigation: Implement rate limiting
  - Mitigation: Monitor API usage

---

## Rate Limiting (Future Enhancement)

To prevent abuse, consider adding:

```typescript
// Simple in-memory rate limiting
const submissions = new Map<string, number[]>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const userSubmissions = submissions.get(ip) || []

  // Remove submissions older than 1 hour
  const recentSubmissions = userSubmissions.filter(time => now - time < 3600000)

  // Allow max 5 submissions per hour
  if (recentSubmissions.length >= 5) {
    return false
  }

  recentSubmissions.push(now)
  submissions.set(ip, recentSubmissions)
  return true
}
```

---

## Monitoring & Maintenance

### What to Monitor
1. **GitHub Issues**: Check for spam or abuse
2. **API Costs**: Monitor Google AI API usage
3. **Error Rates**: Track failed submissions
4. **User Feedback**: Read the issues to improve the site!

### Regular Tasks
- **Weekly**: Review new user-submitted issues
- **Monthly**: Check for spam patterns
- **Quarterly**: Analyze feedback trends

---

## Accessibility

### Keyboard Support
- ✅ **Tab**: Focus the feedback button
- ✅ **Enter/Space**: Open feedback modal
- ✅ **Cmd+Enter** (Mac) / **Ctrl+Enter** (Windows): Submit feedback
- ✅ **Escape**: Close modal
- ✅ **Tab**: Navigate through modal elements

### Screen Reader Support
- ✅ ARIA labels on all interactive elements
- ✅ Role="dialog" on modal
- ✅ Proper focus management
- ✅ Status announcements for success/error

---

## Testing

### Manual Testing Checklist
- [ ] Click feedback button
- [ ] Type feedback and submit
- [ ] Verify success message
- [ ] Check GitHub issue was created
- [ ] Verify issue has proper title, body, labels
- [ ] Test keyboard shortcuts (Cmd+Enter)
- [ ] Test on mobile devices
- [ ] Test with long feedback (>1000 chars)
- [ ] Test with empty feedback (should error)
- [ ] Test error states (disconnect network)

### Example Test Feedback

**Bug Report:**
```
When I click the "Play" button on the homepage, nothing happens.
I'm using Chrome on Mac.
```

**Feature Request:**
```
It would be great if we could save our game progress and come back later!
```

**Question:**
```
How do I unlock the Phone Book in Timeless Minds?
```

**Accessibility Issue:**
```
I can't navigate the games page with just my keyboard. The focus
indicator disappears when I tab through the game cards.
```

---

## Future Enhancements

### Planned Features
- [ ] Rate limiting per IP address
- [ ] Optional email field for follow-up
- [ ] Attach screenshots (drag & drop)
- [ ] Category selection (Bug/Feature/Question)
- [ ] Thank you page with similar issues
- [ ] Track issue status (open/closed)
- [ ] Notification when issue is resolved

### Nice to Have
- [ ] Anonymous voting on existing issues
- [ ] Search existing issues before submitting
- [ ] Sentiment analysis of feedback
- [ ] Automated issue triage
- [ ] Integration with project board

---

## FAQ

**Q: Does this collect any personal information?**
A: No. We only collect the feedback text you provide. No names, emails, or tracking.

**Q: Can I see my submitted feedback?**
A: Yes! After submitting, you'll get a link to the GitHub issue. You can bookmark it or search for it later.

**Q: How long does it take to respond to feedback?**
A: We try to review all feedback within 1-2 weeks. Critical bugs are addressed faster.

**Q: What if I want to submit a bug with screenshots?**
A: Currently, you can describe the issue and we'll follow up. Future versions will support screenshots.

**Q: Can I submit feedback anonymously?**
A: Yes! All feedback is anonymous by default. You don't need to provide any personal information.

---

## Resources

- **GitHub Issues**: https://github.com/shaktech786/verygoodmelon.fun/issues
- **Google Gemini API**: https://ai.google.dev/
- **GitHub REST API**: https://docs.github.com/en/rest

---

*Last Updated: January 15, 2025*
