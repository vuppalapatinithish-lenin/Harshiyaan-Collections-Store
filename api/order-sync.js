function setCors(req, res, origin) {
  const allowedOrigins = [
    "https://www.harshiyaancollections.com",
    "https://harshiyaancollections.com",
    "https://vuppalapatinithish-lenin.github.io",
    "https://harshiyaan-collections-store.vercel.app",
    "https://harshiyaan-collections-igbnf4dda-nithish-746f.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173"
  ];

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Vary", "Origin");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );
}
