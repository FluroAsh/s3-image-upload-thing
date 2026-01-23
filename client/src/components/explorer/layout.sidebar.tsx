export const Sidebar = () => {
  return (
    <div>
      <div className="w-[300px] h-full bg-sky-500/50 p-4 flex flex-col gap-4">
        <div className="bg-sky-600">
          <p>Buckets</p>
          <div>Search Buckets</div>
        </div>

        <div className="bg-sky-700">
          <div>Total Buckets: 0</div>
          <div>Total Files: 0</div>
        </div>

        <div className="flex flex-col gap-2 bg-sky-600">
          {/* <BucketList buckets={buckets} bucketName={activeBucket} /> */}
          <div>Bucket 1</div>
          <div>Bucket 2</div>
          <div>Bucket 3</div>
        </div>
      </div>
    </div>
  );
};
