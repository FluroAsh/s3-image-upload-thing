import { useUpload } from "./provider";

export const ErrorScreen = () => {
	const { uploadError } = useUpload();

	return (
		<div>
			<p>Uh oh, we ran into an error!</p>
			{uploadError && <p className="text-body text-fg-1 mt-2">{uploadError}</p>}
		</div>
	);
};
