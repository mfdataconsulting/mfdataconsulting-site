export default function robots() {
  const baseUrl = "https://www.tectria.com.br";
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
