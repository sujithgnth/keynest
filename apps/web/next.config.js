//@ts-check

const { composePlugins, withNx } = require('@nx/next');

const publicApiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api';
const apiOrigin = publicApiUrl.startsWith('/')
  ? null
  : new URL(publicApiUrl).origin;

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  nx: {},
  poweredByHeader: false,
  async rewrites() {
    const configuredProxy = process.env.API_PROXY_URL;
    if (!configuredProxy) return [];

    const apiProxyUrl = new URL(configuredProxy).toString().replace(/\/$/, '');
    return [
      {
        source: '/api',
        destination: apiProxyUrl,
      },
      {
        source: '/api/:path*',
        destination: `${apiProxyUrl}/:path*`,
      },
    ];
  },
  async headers() {
    const contentSecurityPolicy = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self'",
      `connect-src 'self'${apiOrigin ? ` ${apiOrigin}` : ''}`,
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
    ].join('; ');
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

const plugins = [
  // Add more Next.js plugins to this list if needed.
  withNx,
];

module.exports = composePlugins(...plugins)(nextConfig);
