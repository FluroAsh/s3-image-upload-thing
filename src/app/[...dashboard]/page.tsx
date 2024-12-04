'use client'

import { useAuth } from 'react-oidc-context'
import { useEffect, useState } from 'react'
import { User } from 'oidc-client-ts'
import axios from '@/lib/axios'

export default function Page() {
  const [details, setDetails] = useState<User | null>(null)
  const auth = useAuth()

  useEffect(() => {
    if (auth.isAuthenticated && auth.user) {
      setDetails(auth.user)
    }
  }, [auth.isAuthenticated, auth.user])

  const sendUserDetails = async () => {
    if (!details) return
    console.log(details.id_token)

    try {
      const res = await axios.post('/api/decode', {
        method: 'POST',
        body: { token: details.id_token }
      })

      const { data } = await res
      console.log(data)
    } catch (e) {
      console.warn(e)
    }
  }

  if (auth.isLoading) {
    return <div>Loading...</div>
  }

  if (auth.error) {
    return <div>Encountering error... {auth.error.message}</div>
  }

  if (auth.isAuthenticated) {
    return (
      <div>
        <div className="pb-2 max-w-screen-sm overflow-scroll">
          <pre> Hello: {auth.user?.profile.email} </pre>
          <pre> ID Token: {auth.user?.id_token} </pre>
          <pre> Access Token: {auth.user?.access_token} </pre>
          <pre> Refresh Token: {auth.user?.refresh_token} </pre>
        </div>

        <div className="flex gap-4">
          <button className="rounded-md bg-slate-600 p-2" onClick={() => auth.removeUser()}>
            Sign out
          </button>
          <button className="rounded-md bg-slate-600 p-2" onClick={sendUserDetails}>
            Send Token
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <p>Couldn&apos;t sign you in</p>
      <button className="rounded-md bg-slate-600 p-2" onClick={() => auth.signinRedirect()}>
        Sign in
      </button>
    </div>
  )
}
