import { catchAsync, generateTokenAndSetCookie } from '../lib/utils.js'
import User from '../models/user.model.js'
import axios from "axios";

export const githubCallback = catchAsync(async (req, res) => {
  const code = req.query.code
  if (!code) {
    return res.status(400).json({ message: 'Github code is required' })
  }
  const response = await axios.post(
    'https://github.com/login/oauth/access_token',
    {
      client_id: (process.env.GITHUB_CLIENT_ID || '').trim(),
      client_secret: (process.env.GITHUB_CLIENT_SECRET || '').trim(),
      code,
    },
    {
      headers: {
        Accept: 'application/json',
      },
    },
  )
  const { access_token } = response.data
  if (!access_token) {
    return res
      .status(401)
      .json({ message: 'Failed to authenticate with GitHub' })
  }
  const userResponse = await axios.get('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  })
  const emailResponse = await axios.get('https://api.github.com/user/emails', {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  })
  const verifiedEmail = emailResponse.data.find(
    (email) => email.primary && email.verified,
  )
  if (!verifiedEmail) {
    return res.status(400).json({ message: 'no verified email' })
  }
  const email = (verifiedEmail.email || '').toLowerCase().trim()
  const { login, id, avatar_url } = userResponse.data
  const githubId = String(id)
  const name = login
  const profilePicture = avatar_url
  let user = await User.findOne({
    $or: [{ githubId }, { email }],
  })
  if (!user) {
    // Provision a new password-less account for federated identities
    user = await User.create({
      githubId,
      name: name || login,
      email,
      password: null,
      profilePicture: avatar_url || '',
    })
  } else if (!user.githubId) {
    // Link existing local account to Google identity context
    user.githubId = githubId
    if (!user.profilePicture && avatar_url) {
      user.profilePicture = avatar_url
    }
    await user.save()
  }
  generateTokenAndSetCookie(user._id, res)

  res.redirect(process.env.CLIENT_URL)
})
