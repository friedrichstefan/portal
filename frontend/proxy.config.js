const backendPort = process.env.PORT || 3000;

const proxy = {
  target: `http://localhost:${backendPort}`, // Default target (fallback)
  changeOrigin: true,
  secure: false,
  configure: (proxy, options) => {
    proxy.on('proxyReq', (proxyReq, req, _res) => {
      // Get the Origin or Host header from the incoming request
      const origin = req.headers.origin || `http://${req.headers.host}` || '';

      let requestUrl;
      try {
        requestUrl = new URL(origin);
      } catch (e) {
        console.error('Invalid origin:', origin);
        requestUrl = new URL('http://localhost');
      }

      // Update the proxy request's Host header and path
      proxyReq.setHeader('Host', `${requestUrl.hostname}:${backendPort}`);
      proxyReq.setHeader('x-forwarded-port', requestUrl.port);
      proxyReq.path = req.url; // Preserve the original path
      // Set the target with the same hostname but port where the backend is running
      options.target = `http://${requestUrl.hostname}:${backendPort}`;
    });

    proxy.on('error', (err, req, res) => {
      console.error('Proxy error:', err);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Proxy error occurred.');
      }
    });
  },
};

module.exports = {
  '/callback': proxy,
  '/rest': proxy,
  '/api': proxy,
};
