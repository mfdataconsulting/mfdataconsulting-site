export default function sitemap() {
  const baseUrl = "https://www.tectria.com.br";
  return [
    { url: `${baseUrl}/`, lastModified: new Date() },
    { url: `${baseUrl}/cases`, lastModified: new Date() },
  ];
}
