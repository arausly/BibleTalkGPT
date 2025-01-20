import OpenAI from 'openai';

const BTFineTunedModel = 'ft:gpt-3.5-turbo-0125:personal::AliZC6m5';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
};

const createdResponseWithCorsHeaders = (body?: BodyInit) => new Response(body, { headers: corsHeaders });

export default {
	async fetch(request, env, ctx): Promise<Response> {
		if (request.method === 'OPTIONS') {
			//preflight
			return createdResponseWithCorsHeaders();
		}

		const client = new OpenAI({
			apiKey: env.OPENAI_API_KEY,
		});
		const url = new URL(request.url);
		const isPostRequest = request.method === 'POST';

		if (url.pathname === '/api/moderation' && isPostRequest) {
			const { hint } = (await request.json()) as { hint: string };
			try {
				const moderation = await client.moderations.create({
					model: 'omni-moderation-latest',
					input: hint,
				});
				if (!moderation) throw Error(); //fallback to internal check
				const modResult = moderation.results[0];
				const categories = modResult.categories;
				return createdResponseWithCorsHeaders(JSON.stringify({ flagged: modResult.flagged, categories }));
			} catch (err) {
				return createdResponseWithCorsHeaders(JSON.stringify({ flagged: false }));
			}
		}

		if (url.pathname === '/api/generate/flyer' && isPostRequest) {
			// handle generate flyer
			const { topic } = (await request.json()) as { topic: string };
			const prompt = `
               Design a Minimalistic simple full-frame 2D invitation poster that I can post on my social media status with no background or borders, shadows, orientation, tilts or backdrop where the poster design covers the entire image from edge to edge. The flyer should have no empty or colored space around it, no frame and no additional objects or context---Just the poster design filling the entire canvas. In addition, The following rules must be adhered to: 
               1. The design should boldly state the topic ${topic}. 
               2. At the bottom of the design, it should display the venue of the discussion is "KFC, Ikeja ICM"
               3. Below the venue should be the time it starts which is "7pm on Friday". 
               4. The poster image should fill the whole canvas from edge to edge with no visible space. 
               5. crop out any background and just leave the image itself
          `;
			try {
				const response = await client.images.generate({
					model: 'dall-e-3',
					prompt,
					n: 1,
					size: '1024x1024',
					response_format: 'b64_json', //url
				});
				if (!response) throw Error("Couldn't generate flyer");

				return createdResponseWithCorsHeaders(JSON.stringify({ image: response.data[0].b64_json ?? '' }));
			} catch (err) {
				return createdResponseWithCorsHeaders('');
			}
		}

		if (url.pathname === '/api/generate/discussion' && isPostRequest) {
			//handle BT generation
			const { hint } = (await request.json()) as { hint: string };
			try {
				const response = await client.chat.completions.create({
					model: BTFineTunedModel,
					messages: [
						{
							role: 'system',
							content: `
							  You are an preacher with the gift of the gab, you prepare weekly bible discussions.
	
							  RESPONSE FORMAT:
							  Generate a JSON object in exactly this shape, it must be a valid JSON:
							  {
								 bibleTalkTopic:  "string",
								 introductoryStatement: "string",
								 icebreakerQuestion: "string",
								 firstScripture: "string",
								 firstQuestion: "string",
								 secondScripture: "string",
								 secondQuestion: "string",
								 lastScripture: "string",
								 lastQuestion: "string",
								 concludingStatement: "string"
							  }
	
							  important rules:
								1. The introductory statement should include your name.
								2. The bible talk topic should be very catchy.
								3. The questions should be short and be in relation to the scripture just read and also the topic in discussion.
								4. The questions must all be in-line with the discussion and NOT out of scope, also will be good if the questions are simple.
								5. The concludingStatement field should be a witty statement that brings to focus the main points of the discussion, should be at least 300 words.
	
							  ALSO IMPORTANT: When providing scripture references, please always include both the reference (e.g., John 3:16) and the full scripture text that corresponds to it!
							`,
						},
						{ role: 'user', content: hint },
					],
					temperature: 1, //default 1
					presence_penalty: 0.2, // default 0
					frequency_penalty: 0, // default 0
					response_format: {
						type: 'json_object',
					},
				});
				if (!response?.choices?.length) throw Error();
				const result = JSON.parse(response.choices[0].message.content ?? '');
				return createdResponseWithCorsHeaders(JSON.stringify({ discussion: result }));
			} catch (err) {
				return createdResponseWithCorsHeaders(JSON.stringify({ discussion: '' }));
			}
		}

		return createdResponseWithCorsHeaders('');
	},
} satisfies ExportedHandler<Env>;
