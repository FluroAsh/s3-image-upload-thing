'use client'

import { useAuth } from 'react-oidc-context'

export default function Page() {
  const auth = useAuth()

  const signOutRedirect = () => {
    const clientId = '2icfqrt520ca1fvou0hbtrcdfq'
    const logoutUri = '<logout uri>'
    const cognitoDomain = 'https://ap-southeast-2oygjrctnu.auth.ap-southeast-2.amazoncognito.com'
    window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`
  }

  return (
    <div>
      {/* Once signed in via AWS, exchange the `ID Token` for AWS temporary credentials using the `aws-sdk` */}
      <button onClick={() => auth.signinRedirect()}>Sign in</button>
      <button onClick={() => signOutRedirect()}>Sign out</button>
    </div>
  )
}
