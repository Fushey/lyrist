import type { NextApiRequest, NextApiResponse } from "next";
import { Client } from "genius-lyrics";

const nullishQueries = ["None", "N/A", "null", "undefined"];

// RapidAPI secret (store this securely, e.g., as an environment variable)
const RAPIDAPI_PROXY_SECRET = process.env.RAPIDAPI_PROXY_SECRET;

// Updated list of RapidAPI IP addresses
const RAPIDAPI_IPS = [
  // US West
  '107.23.255.128', '107.23.255.129', '107.23.255.131', '107.23.255.132', '107.23.255.133',
  '107.23.255.134', '107.23.255.135', '107.23.255.137', '107.23.255.138', '107.23.255.139',
  '107.23.255.140', '107.23.255.141', '107.23.255.142', '107.23.255.143', '107.23.255.144',
  '107.23.255.145', '107.23.255.146', '107.23.255.147', '107.23.255.148', '107.23.255.149',
  '107.23.255.150', '107.23.255.151', '107.23.255.152', '107.23.255.153', '107.23.255.154',
  '107.23.255.155', '107.23.255.156', '107.23.255.157', '107.23.255.158', '107.23.255.159',
  '35.162.152.183', '52.38.28.241', '52.35.67.149', '54.149.215.237',
  // Mumbai
  '13.127.146.34', '13.127.207.241', '13.232.235.243', '13.233.81.143',
  // Tokyo
  '13.112.233.15', '54.250.57.56', '18.182.156.77', '52.194.200.157',
  // Frankfurt
  '3.120.160.95', '18.184.214.33', '18.197.117.10', '3.121.144.151',
  // Sydney
  '13.239.156.114', '13.238.1.253', '13.54.58.4', '54.153.234.158',
  // South America
  '18.228.167.221', '18.228.209.157', '18.228.209.53', '18.228.69.72',
  // Singapore
  '13.228.169.5', '3.0.35.31', '3.1.111.112', '52.220.50.179',
  // Ireland
  '34.250.225.89', '52.30.208.221', '63.34.177.151', '63.35.2.11'
];

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    // Check the X-RapidAPI-Proxy-Secret header
    const rapidApiSecret = req.headers['x-rapidapi-proxy-secret'];
    if (rapidApiSecret !== RAPIDAPI_PROXY_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Optionally, check if the request is coming from a RapidAPI IP
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const ipToCheck = Array.isArray(clientIp) ? clientIp[0] : clientIp?.split(',')[0];
    
    if (ipToCheck && !RAPIDAPI_IPS.includes(ipToCheck)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const client = new Client();
    if (req.method === "GET") {
      const { query } = req.query;
      if (!Array.isArray(query) || !query) {
        return res.status(400).json({ error: "Bad request" });
      }
      if (
        query.length <= 2 &&
        query.length !== 0 &&
        !query.some((q) => nullishQueries.includes(q))
      ) {
        try {
          const searches = await client.songs.search(
            `${decodeURIComponent(query[0] as string)} ${decodeURIComponent(
              query?.length > 1 ? (query[1] as string) : ""
            )}`
          );
          const song = searches[0];
          const lyrics = await song?.lyrics();
          res.setHeader(
            "Cache-Control",
            "public, s-maxage=86400, stale-while-revalidate=43200"
          );
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Access-Control-Allow-Origin", "*");
          return res.status(200).json({
            lyrics: lyrics,
            title: song?.title,
            artist: song?.artist.name,
            album: song?.album?.name,
            albumArt: song?.album?.image,
            releaseDate: song?.releasedAt,
            image: song?.image,
          });
        } catch (error) {
          console.error(error);
          return res.status(404).json({ error: "Lyrics not found" });
        }
      } else {
        return res.status(400).json({ error: "Bad request" });
      }
    } else {
      return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export default handler;
