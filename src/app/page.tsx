"use client";
import React from "react";
import { ArrowLongRightIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { Spinner } from "./libs/spinner.component";
import OpenAI from "openai";
// import { zodResponseFormat } from "openai/helpers/zod";
// import { z } from "zod";

const client = new OpenAI({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
});

const btModel = "ft:gpt-3.5-turbo-0125:personal::AliZC6m5";

interface DiscussionType {
    bibleTalkTopic: "string";
    introductoryStatement: "string";
    icebreakerQuestion: "string";
    firstScripture: "string";
    firstQuestion: "string";
    secondScripture: "string";
    secondQuestion: "string";
    lastScripture: "string";
    lastQuestion: "string";
    concludingStatement: "string";
}

// const DiscussionSchema = z.object({
//     bibleTalkTopic: z.string(),
//     introductoryStatement: z.string(),
//     icebreakerQuestion: z.string(),
//     firstScripture: z.string(),
//     firstQuestion: z.string(),
//     secondScripture: z.string(),
//     secondQuestion: z.string(),
//     lastScripture: z.string(),
//     lastQuestion: z.string(),
//     concludingStatement: z.string()
// });

export default function Home() {
    const [hint, setHint] = React.useState<string>("");
    const [discussion, setDiscussion] = React.useState<DiscussionType>();
    const [loading, setLoading] = React.useState<boolean>(false);
    const [fineTuning, setIsFineTuning] = React.useState<boolean>(false);
    const [tuningMsg, setTuningMsg] = React.useState<string>("");
    const [fineTunedModel, setFineTunedModel] = React.useState<string | null>(
        btModel
    );

    const btnDisabled = !hint.length || loading;
    const btnBackgroundColor = !btnDisabled ? "bg-[#0a0a0a]" : "bg-[#B7B7B7]";
    const textColor = !btnDisabled ? "text-[#0a0a0a]" : "text-[#B7B7B7]";

    const getBibleTalkNote = React.useCallback(async () => {
        if (!hint.length || !fineTunedModel) return;
        try {
            setLoading(true);
            const response = await client.chat.completions.create({
                model: fineTunedModel,
                messages: [
                    {
                        role: "system",
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

                          When providing scripture references, please always include both the reference (e.g., John 3:16) and the full scripture text that corresponds to it.
                        `
                    },
                    { role: "user", content: hint }
                ],
                response_format: {
                    type: "json_object"
                }
            });
            if (!response?.choices?.length) throw Error("");
            const result = JSON.parse(
                response.choices[0].message.content ?? ""
            );
            setDiscussion(result);
            setHint("");
        } catch (err) {
        } finally {
            setLoading(false);
        }
    }, [hint, fineTunedModel, client]);

    const revertToDefaultTuningMsg = React.useCallback(() => {
        setTimeout(() => {
            setTuningMsg("");
            setIsFineTuning(false);
        }, 500);
    }, []);

    const createFineTuningJob = async (fileId: string, jobId = "") => {
        //if there is a job id then I am not creating a job
        let job: any;
        if (!jobId) {
            job = await client.fineTuning.jobs.create({
                training_file: fileId,
                model: "gpt-3.5-turbo"
            });
            if (!job.id) throw new Error("Failed to fine tune model");
            setTimeout(() => {
                setTuningMsg("Fine tuning starting");
                createFineTuningJob(fileId, job.id);
            }, 60 * 1000); //check after one minute
        } else {
            const tuneInfo = await client.fineTuning.jobs.retrieve(jobId);
            if (
                tuneInfo.status === "failed" ||
                tuneInfo.status === "cancelled"
            ) {
                setTuningMsg("Failed");
                revertToDefaultTuningMsg();
                throw new Error("Failed to fine tune model");
            }
            if (tuneInfo.status !== "succeeded") {
                setTuningMsg("Fine tuning in progress");
                setTimeout(() => {
                    createFineTuningJob(fileId, tuneInfo.id);
                }, 60 * 1000); //check after one minute
            } else {
                setTuningMsg("Done");
                setFineTunedModel(tuneInfo.fine_tuned_model);
                revertToDefaultTuningMsg();
            }
        }
    };

    const trainModelWithLocalData = async () => {
        try {
            setIsFineTuning(true);
            setTuningMsg("Fine tuning start...");
            //create a file in openai
            const upload = await client.files.create({
                file: await fetch("http://localhost:3000/bibletalk.jsonl"),
                purpose: "fine-tune"
            });
            if (!upload?.id) {
                setTuningMsg("Failed");
                revertToDefaultTuningMsg();
                throw Error("failed to upload file for fine tuning");
            }
            setTuningMsg("Uploaded file");

            //creating a fine tuning job
            await createFineTuningJob(upload.id);
        } catch (err) {
            setTuningMsg("Failed");
            revertToDefaultTuningMsg();
            console.error(err);
        }
    };

    // const getScriptureLink = (scripture: string) => {
    //     const splitScripture = scripture.split(" ");
    //     if (splitScripture[0] && !isNaN(Number(splitScripture[0]))) {
    //         const bookName = `${
    //             splitScripture[1][0]
    //         }${splitScripture[1].substring(1)}`;
    //         const [chapter, verse] = splitScripture[2].split(":");
    //         return `https://www.bibleref.com/${splitScripture[0]}-${bookName}/${chapter}/${splitScripture[0]}-${bookName}-${chapter}-${verse}.html`;
    //     }
    //     const [c, v] = splitScripture[1].split(":");
    //     return `https://www.bibleref.com/${splitScripture[0]}/${c}/${splitScripture[0]}-${c}-${v}.html`;
    // };

    return (
        <div className="v-screen h-screen flex flex-col items-center justify-center p-8 relative">
            <button
                className={`flex justify-center items-center rounded-md w-auto px-8 transition ease-in-out h-10 absolute top-5 right-5 bg-white`}
                onClick={trainModelWithLocalData}
            >
                {fineTuning ? (
                    <p className="text-black">{tuningMsg}</p>
                ) : (
                    <p className="text-black">Fine tune</p>
                )}
            </button>
            <main className="bg-white rounded-md p-16 w-full md:w-8/12 overflow-y-scroll">
                <p className="text-black mb-8 text-center text-3xl font-semibold">
                    BibleTalkGPT
                </p>
                <section className="relative">
                    <SparklesIcon
                        className={`h-5 v-5 absolute left-5 top-4 ${textColor} transition ease-in-out`}
                    />
                    <textarea
                        className="w-full h-40 rounded-lg bg-[#F5F5F7] text-black p-4 pl-12"
                        placeholder="Drop hints on what kind of bible talk you would like to teach"
                        value={hint}
                        onChange={(e) => setHint(e.target.value)}
                    />
                    <button
                        className={`flex justify-center items-center rounded-md w-10 transition ease-in-out h-10 absolute bottom-5 right-5 ${btnBackgroundColor}`}
                        onClick={getBibleTalkNote}
                    >
                        {loading ? (
                            <Spinner size="small" />
                        ) : (
                            <ArrowLongRightIcon className="text-white h-5 w-5" />
                        )}
                    </button>
                </section>
                {discussion ? (
                    <section className="mt-16 border p-8 w-full rounded-md text-black space-y-4">
                        <h1 className="text-2xl">
                            Bible discussion for today!
                        </h1>
                        <div>
                            <p className="text-xl">Topic</p>
                            <p className="font-semibold italic text-lg">
                                {discussion.bibleTalkTopic}
                            </p>
                        </div>
                        <p className="italic">
                            {discussion.introductoryStatement}
                        </p>
                        <div>
                            <p className="font-medium underline">
                                Ice breaker question
                            </p>
                            <p>{discussion.icebreakerQuestion}</p>
                        </div>
                        <div>
                            <p className="font-medium underline">
                                First scripture
                            </p>
                            <p>{discussion.firstScripture}</p>
                        </div>
                        <div className="">
                            <p className="font-medium underline">
                                First question
                            </p>
                            <p>{discussion.firstQuestion}</p>
                        </div>
                        <div>
                            <p className="font-medium underline">
                                Second scripture
                            </p>
                            <p>{discussion.secondScripture}</p>
                        </div>
                        <div className="">
                            <p className="font-medium underline">
                                Second question
                            </p>
                            <p>{discussion.secondQuestion}</p>
                        </div>

                        <div className="">
                            <p className="font-medium underline">
                                Last scripture
                            </p>
                            <p>{discussion.lastScripture}</p>
                        </div>
                        <div>
                            <p className="font-medium underline">
                                Last question
                            </p>
                            <p>{discussion.lastQuestion}</p>
                        </div>

                        <div>
                            <p className="font-medium underline">
                                In conclusion
                            </p>
                            <p>{discussion.concludingStatement}</p>
                        </div>
                    </section>
                ) : null}
            </main>
        </div>
    );
}
