import "./App.css"
import "@fillout/react/style.css"

import { useEffect, useState } from "react"

import { FilloutStandardEmbed } from "@fillout/react"

const NOTION_API_KEY = import.meta.env.VITE_NOTION_API_KEY
const NOTION_DATABASE_ID = import.meta.env.VITE_NOTION_DATABASE_ID
const API_BASE = process.env.NODE_ENV === "production" ? "https://your-vercel-app.vercel.app/api/notion" : "http://localhost:3000/api/notion"

interface NotionData {
	id: string
	properties: {
		[key: string]: {
			type: string
			[key: string]: any
		}
	}
}

const NotionDisplay = ({ data }: { data: NotionData[] }) => {
	const getPropertyValue = (property: any) => {
		if (!property) return ""
		switch (property.type) {
			case "title":
				return property.title?.[0]?.text?.content || ""
			case "rich_text":
				return property.rich_text?.[0]?.text?.content || ""
			case "number":
				return property.number?.toString() || ""
			case "select":
				return property.select?.name || ""
			case "multi_select":
				return property.multi_select?.map((item: any) => item.name).join(", ") || ""
			case "date":
				return property.date?.start || ""
			default:
				return JSON.stringify(property, null, 2)
		}
	}

	if (!data.length) return null

	return (
		<div style={{ fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
			{data.map((item) => (
				<div key={item.id} style={{ marginBottom: "1rem" }}>
					{Object.entries(item.properties).map(([key, property]) => (
						<div key={key}>
							<strong>{key}:</strong> {getPropertyValue(property)}
						</div>
					))}
				</div>
			))}
		</div>
	)
}

function App() {
	const [notionData, setNotionData] = useState<NotionData[]>([])
	const [loading, setLoading] = useState(true)
	const [debugState, setDebugState] = useState({
		dataReceived: false,
		dataLength: 0,
		lastUpdate: Date.now(),
	})

	useEffect(() => {
		const fetchNotionData = async () => {
			try {
				const response = await fetch(`${API_BASE}/v1/databases/${NOTION_DATABASE_ID}/query`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
				})
				const data = await response.json()
				console.log("Raw data:", data)

				if (data?.results && Array.isArray(data.results)) {
					setNotionData(data.results)
					setDebugState({
						dataReceived: true,
						dataLength: data.results.length,
						lastUpdate: Date.now(),
					})
				}
			} catch (error) {
				console.error("Error fetching Notion data:", error)
			} finally {
				setLoading(false)
			}
		}

		fetchNotionData()
	}, [])

	return (
		<div className='App'>
			<h1>My Form</h1>

			<div style={{ marginBottom: "2rem" }}>
				{loading ? (
					<p>Loading Notion data...</p>
				) : (
					<div style={{ overflowX: "auto" }}>
						<NotionDisplay data={notionData} />
					</div>
				)}
			</div>

			<div style={{ position: "relative", height: "90vh" }}>
				<FilloutStandardEmbed filloutId='jXt8LFbYfXus' />
			</div>
		</div>
	)
}

export default App
