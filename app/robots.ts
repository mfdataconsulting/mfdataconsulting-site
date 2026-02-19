export default function robots() {
  const baseUrl = "https://mfdataconsulting.com";
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
