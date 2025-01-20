"use client";
import React from "react";
import OpenAI from "openai";
import { ArrowLongRightIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { Spinner } from "./libs/spinner.component";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { useToast } from "@/components/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { apiURL } from "@/lib/utils";

// import Image from "next/image";
// import { zodResponseFormat } from "openai/helpers/zod";
// import { z } from "zod";

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

type MaliciousCategoryKeyType = keyof OpenAI.Moderations.Moderation.Categories;
type ModerationResponseType = {
    flagged: boolean;
    categories?: OpenAI.Moderations.Moderation.Categories;
};

const maliciousHintCategory = (
    categories?: OpenAI.Moderations.Moderation.Categories
): string => {
    if (!categories) return "";
    let message = "Hint appears to be suggestive of ";
    Object.keys(categories).forEach((key) => {
        if (categories[key as MaliciousCategoryKeyType]) {
            message += `${key}, `;
        }
    });
    return message.replace(
        /,\s+$/,
        " etc. Please contact support if you need more clarifications"
    );
};

export default function Home() {
    const [hint, setHint] = React.useState<string>("");
    const [discussion, setDiscussion] = React.useState<DiscussionType>();
    const [loading, setLoading] = React.useState<boolean>(false);
    const [fineTuning, setIsFineTuning] = React.useState<boolean>(false);
    const [tuningMsg, setTuningMsg] = React.useState<string>("");
    const [fineTunedModel, setFineTunedModel] = React.useState<string | null>(
        btModel
    );
    const [flyerURL, setFlyerURL] = React.useState<string>("");
    const [flyerLoading, setFlyerLoading] = React.useState<boolean>(false);
    const [reloadFlyer, setReloadFlyer] = React.useState<boolean>(false);
    const [extraFlyerPrompt, setExtraFlyerPrompt] = React.useState<string>("");

    const btnDisabled = !hint.length || loading;
    const btnBackgroundColor = !btnDisabled ? "bg-[#0a0a0a]" : "bg-[#B7B7B7]";
    const textColor = !btnDisabled ? "text-[#0a0a0a]" : "text-[#B7B7B7]";

    const { toast } = useToast();

    const getBibleTalkNote = React.useCallback(async () => {
        if (!hint.length || !fineTunedModel) return;
        try {
            setLoading(true);
            const { flagged: isHintSinister, categories } =
                await possiblySinisterHint(hint);
            if (isHintSinister) {
                return toast({
                    title: "Malicious hint",
                    description: `Your hint doesn't align with our policy, ${maliciousHintCategory(
                        categories
                    )}`,
                    action: (
                        <ToastAction altText="Goto schedule to undo">
                            close
                        </ToastAction>
                    )
                });
            }
            const { discussion } = await (
                await fetch(`${apiURL}/api/generate/discussion`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ hint })
                })
            ).json();
            setDiscussion(discussion);
            setHint("");
        } catch (err) {
        } finally {
            setLoading(false);
        }
    }, [hint, fineTunedModel]);

    /** check that the user hint isn't anything sinister */
    const possiblySinisterHint = React.useCallback(
        async (hint: string): Promise<ModerationResponseType> => {
            try {
                const moderation: ModerationResponseType = await (
                    await fetch(`${apiURL}/api/moderation`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "applications/json"
                        },
                        body: JSON.stringify({
                            hint
                        })
                    })
                ).json();
                return moderation;
            } catch (err) {
                return { flagged: false };
            }
        },
        []
    );

    const revertToDefaultTuningMsg = React.useCallback(() => {
        setTimeout(() => {
            setTuningMsg("");
            setIsFineTuning(false);
        }, 500);
    }, []);

    const createFineTuningJob = async (fileId: string, jobId = "") => {
        // //if there is a job id then I am not creating a job
        // let job: any;
        // if (!jobId) {
        //     job = await client.fineTuning.jobs.create({
        //         training_file: fileId,
        //         model: "gpt-3.5-turbo"
        //     });
        //     if (!job.id) throw new Error("Failed to fine tune model");
        //     setTimeout(() => {
        //         setTuningMsg("Fine tuning starting");
        //         createFineTuningJob(fileId, job.id);
        //     }, 60 * 1000); //check after one minute
        // } else {
        //     const tuneInfo = await client.fineTuning.jobs.retrieve(jobId);
        //     if (
        //         tuneInfo.status === "failed" ||
        //         tuneInfo.status === "cancelled"
        //     ) {
        //         setTuningMsg("Failed");
        //         revertToDefaultTuningMsg();
        //         throw new Error("Failed to fine tune model");
        //     }
        //     if (tuneInfo.status !== "succeeded") {
        //         setTuningMsg("Fine tuning in progress");
        //         setTimeout(() => {
        //             createFineTuningJob(fileId, tuneInfo.id);
        //         }, 60 * 1000); //check after one minute
        //     } else {
        //         setTuningMsg("Done");
        //         setFineTunedModel(tuneInfo.fine_tuned_model);
        //         revertToDefaultTuningMsg();
        //     }
        // }
    };

    const trainModelWithLocalData = async () => {
        return; //todo create feature for users to upload files from FE
        // try {
        //     setIsFineTuning(true);
        //     setTuningMsg("Fine tuning start...");
        //     //create a file in openai
        //     const upload = await client.files.create({
        //         file: await fetch("http://localhost:3000/bibletalk.jsonl"),
        //         purpose: "fine-tune"
        //     });
        //     if (!upload?.id) {
        //         setTuningMsg("Failed");
        //         revertToDefaultTuningMsg();
        //         throw Error("failed to upload file for fine tuning");
        //     }
        //     setTuningMsg("Uploaded file");

        //     //creating a fine tuning job
        //     await createFineTuningJob(upload.id);
        // } catch (err) {
        //     setTuningMsg("Failed");
        //     revertToDefaultTuningMsg();
        //     console.error(err);
        // }
    };

    React.useEffect(() => {
        (async () => {
            if (discussion) {
                try {
                    setFlyerLoading(true);
                    const { image } = await (
                        await fetch(`${apiURL}/api/generate/flyer`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                topic: discussion.bibleTalkTopic
                            })
                        })
                    ).json();

                    setFlyerURL(image ?? "");
                } catch (err) {
                    console.error("IMAGE ERROR ==>", err);
                } finally {
                    setFlyerLoading(false);
                }
            }
        })();
    }, [discussion, reloadFlyer, extraFlyerPrompt]);

    const flyerSRC = `data:image/png;base64,${flyerURL}`;

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
                        <div className="my-8 w-full flex md:justify-center">
                            {flyerLoading ? (
                                <Skeleton className="w-4/6 h-96 rounded-lg" />
                            ) : flyerURL && !flyerLoading ? (
                                <Dialog>
                                    <DialogTrigger className="w-full md:w-2/6 h-96 ">
                                        <div className="bg-contain">
                                            <img
                                                src={flyerSRC}
                                                alt="Flyer for bible discussion"
                                                className="w-full h-96 cursor-zoom-in"
                                            />
                                        </div>
                                    </DialogTrigger>
                                    <DialogContent className="v-screen h-screen">
                                        <VisuallyHidden.Root>
                                            <DialogHeader>
                                                <DialogTitle />
                                                <DialogDescription />
                                            </DialogHeader>
                                        </VisuallyHidden.Root>
                                        <img
                                            src={flyerSRC}
                                            alt="Flyer for bible discussion"
                                            className="w-full h-full"
                                        />
                                    </DialogContent>
                                </Dialog>
                            ) : null}
                        </div>
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
