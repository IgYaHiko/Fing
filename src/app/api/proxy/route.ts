import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const target = searchParams.get('url')
  if (!target) {
    return NextResponse.json({ error: 'Missing URL' }, { status: 400 })
  }

  try {
    const res = await fetch(target)
    const html = await res.text()

    const response = new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })

    // Remove restrictive headers
    response.headers.delete('X-Frame-Options')
    response.headers.delete('Content-Security-Policy')

    return response
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch target' }, { status: 500 })
  }
}
