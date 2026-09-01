"use server"

import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'


export type SessionPayload = {
    userId: string
    expiresAt: Date
}

const secretKey = process.env.AUTH_SECRET
if (!secretKey) {
    throw new Error('AUTH_SECRET must be set')
}
const encodedKey = new TextEncoder().encode(secretKey)


export async function encrypt(payload: SessionPayload) {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(encodedKey)
}

export async function decrypt(session: string | undefined = '') {
    try {
        const { payload } = await jwtVerify(session, encodedKey, {
            algorithms: ['HS256'],
        })
        return payload
    } catch (error) {
        console.log('Failed to verify session')
    }
}

export async function createSession(userId: string) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const session = await encrypt({ userId, expiresAt })
    const cookieStore = await cookies()

    cookieStore.set('session', session, {
        httpOnly: true,
        secure: true,
        expires: expiresAt,
        sameSite: 'lax',
        path: '/',
    })
}


export async function verifySession(): Promise<{ userId: string }> {
    const cookiesStore = await cookies();
    const cookieSession = cookiesStore.get('session')?.value

    const session = await decrypt(cookieSession)
    if (!session?.userId) {
        redirect('/login')
    }

    return { userId: session.userId as string }
}

export async function deleteSession() {
    const cookieStore = await cookies()
    cookieStore.delete('session')
    redirect('/login')
}



export async function updateSession() {
    const session = (await cookies()).get('session')?.value
    const payload = await decrypt(session)

    if (!session || !payload) {
        return null
    }

    // Only refresh if expiration is less than 5 days away (preventing thrashing)
    const expiresAt = new Date(payload.expiresAt as string).getTime();
    const fiveDaysInMs = 5 * 24 * 60 * 60 * 1000;

    if (expiresAt - Date.now() > fiveDaysInMs) {
        return null; // Token is still fresh enough
    }

    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    // Re-sign the JWT with new expiration
    const newSession = await encrypt({ userId: payload.userId as string, expiresAt: newExpiresAt })

    const cookieStore = await cookies()
    cookieStore.set('session', newSession, {
        httpOnly: true,
        secure: true,
        expires: newExpiresAt,
        sameSite: 'lax',
        path: '/',
    })
}
