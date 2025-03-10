import axios from "axios";
import dotenv from "dotenv";
import { fetchfilecontent } from "./fetchfilecontent";

dotenv.config();

const owner = "Rishabh426";
const repo = "test_repo";
const githubToken = process.env.GITHUB_TOKEN;

async function getLatestCommit(): Promise<string | null> {
    try {
        const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/commits`, {
            headers: {
                Authorization: `Bearer ${githubToken}`,
                Accept: "application/vnd.github.v3+json",
            },
            params: { per_page: 1 },
        });

        if (response.data.length === 0) {
            console.log("No commits found");
            return null;
        }

        return response.data[0].sha;
    } catch (err: any) {
        console.log("ERROR IN FETCHING DATA", err.response?.data || err.message);
        return null;
    }
}

async function getChangedFiles(commitSha: string) {
    try {
        const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/commits/${commitSha}`, {
            headers: { Authorization: `Bearer ${githubToken}` },
        });

        if (!response.data.files || response.data.files.length === 0) {
            console.log("No files changed in this commit.");
            return [];
        }

        return response.data.files.map((file: any) => file.filename);
    } catch (err: any) {
        console.error("Error fetching commit changes:", err.response?.data || err.message);
        return [];
    }
}
async function fetchChangedFilesContent() {
    const commitSha = await getLatestCommit();
    if (!commitSha) return;

    const changedFiles = await getChangedFiles(commitSha);
    if (!changedFiles.length) {
        console.log("No files modified in this commit.");
        return;
    }

    console.log("Files modified:", changedFiles);
    const fileContents = await Promise.all(changedFiles.map(fetchfilecontent));

    fileContents.forEach(({ filePath, content }) => {
        if (content) {
            console.log(`\n📄 File: ${filePath}`);
            console.log("------------------------------------------------");
            console.log(content);
            console.log("------------------------------------------------");
        }
    });

    console.log("Fetched all modified files successfully!");
}

async function isRecentCommit() {
    const commitSha = await getLatestCommit();
    if (!commitSha) return false;

    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/commits/${commitSha}`, {
        headers: { Authorization: `Bearer ${githubToken}` },
    });

    const commitTimestamp = response.data.commit.author.date;
    const commitTime = new Date(commitTimestamp).getTime();
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;

    return commitTime >= tenMinutesAgo;
}

(async () => {
    const isRecent = await isRecentCommit();
    if (isRecent) {
        console.log("✅ A recent commit was made in the last 10 minutes.");
        await fetchChangedFilesContent();
    } else {
        console.log("No commit was made in the last 10 minutes.");
    }
})();
