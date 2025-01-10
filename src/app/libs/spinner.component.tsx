const spinnerSizes = {
    tiny: "w-4 h-4",
    small: "w-6 h-6",
    medium: "w-8 h-8",
    large: "w-10 h-10"
};

interface SpinnerProps {
    size?: keyof typeof spinnerSizes;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = "tiny" }) => {
    return (
        <div role="status">
            <div
                className={`inline-block ${spinnerSizes[size]} animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1s_linear_infinite]`}
                role="status"
            >
                <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                    Loading...
                </span>
            </div>
        </div>
    );
};
