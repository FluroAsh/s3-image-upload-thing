'use client'

import { AuthProvider } from 'react-oidc-context'

const cognitoAuthConfig = {
  authority: 'https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_oYGjRCTNU',
  client_id: '2icfqrt520ca1fvou0hbtrcdfq',
  redirect_uri: 'http://localhost:3000/dashboard',
  response_type: 'code',
  scope: 'phone openid email'
}

type ProvidersProps = {
  children: React.ReactNode
}
export default function Providers({ children }: ProvidersProps) {
  return <AuthProvider {...cognitoAuthConfig}>{children}</AuthProvider>
}
