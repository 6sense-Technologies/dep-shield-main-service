// Actual object has more properties, but these are the most relevant for a push event
type IGitHubPushWebhook = {
    ref: string;
    before: string;
    after: string;
    created: boolean;
    deleted: boolean;
    forced: boolean;
    compare: string;
    repository: {
        owner: {
            name: string;
            email: string;
            login: string;
            id: number;
        };
        id: number;
        name: string;
        full_name: string;
        private: boolean;
        html_url: string;
        default_branch: string;
        url: string;
    };
    pusher: {
        name: string;
        email: string;
    };
    sender: {
        login: string;
        id: number;
        html_url: string;
        avatar_url: string;
    };
    commits: Array<{
        id: string;
        message: string;
        timestamp: string;
        url: string;
        added: string[];
        removed: string[];
        modified: string[];
        author: {
            name: string;
            email: string;
        };
        committer: {
            name: string;
            email: string;
        };
    }>;
    head_commit: {
        id: string;
        message: string;
        timestamp: string;
        url: string;
        added: string[];
        removed: string[];
        modified: string[];
        author: {
            name: string;
            email: string;
            username: string;
        };
        committer: {
            name: string;
            email: string;
            username: string;
        };
    };
};
