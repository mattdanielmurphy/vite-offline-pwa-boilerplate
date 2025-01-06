import { NextApiRequest, NextApiResponse } from "next"

import { createProxyMiddleware } from "http-proxy-middleware"

const proxy = createProxyMiddleware({
	target: "https://api.notion.com",
	changeOrigin: true,
	pathRewrite: {
		"^/api/notion": "",
	},
	headers: {
		Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
		"Notion-Version": "2022-06-28",
	},
})

export default function handler(req: NextApiRequest, res: NextApiResponse) {
	// @ts-ignore
	proxy(req, res, (result: any) => {
		if (result instanceof Error) {
			throw result
		}
		throw new Error(`Request '${req.url}' is not proxied! We should never reach here!`)
	})
}

export const config = {
	api: {
		bodyParser: false,
	},
}
