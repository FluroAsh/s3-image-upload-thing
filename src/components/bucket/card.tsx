'use client'

import { FiGlobe, FiCalendar, FiDatabase } from 'react-icons/fi'

const DetailSection: React.FC<{ label: string; text: string; icon: React.ReactNode }> = ({ label, text, icon }) => {
  return (
    <div className="flex gap-2 p-2 items-center">
      <div className="p-2 bg-sky-600/25 rounded-full">{icon}</div>
      <div className="tracking-tight ">
        <p className="text-xs font-medium text-neutral-400">{label}</p>
        <p className="text-sm font-semibold ">{text}</p>
      </div>
    </div>
  )
}

type BucketCardProps = {
  name: string
  region: string
  formattedCreationDate: string
  handleClick: () => void
}

export const BucketCard = ({ name, region, formattedCreationDate, handleClick }: BucketCardProps) => {
  return (
    <div
      className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-md border border-gray-700 max-h-fit min-w-[250px] transition hover:cursor-pointer hover:brightness-125"
      onClick={handleClick}
    >
      <div className="pt-4 px-4 leading-tight">
        <h3 className="font-bold text-center text-transparent text-clip bg-clip-text bg-gradient-to-br from-blue-400 to-teal-400">
          {name}
        </h3>
      </div>

      <div className="grid gap-2 p-2">
        <DetailSection label="Bucket Name" text={name} icon={<FiDatabase className="stroke-sky-500" />} />
        <DetailSection label="Region" text={region} icon={<FiGlobe className="stroke-sky-500" />} />
        <DetailSection
          label="Created on"
          text={formattedCreationDate}
          icon={<FiCalendar className="stroke-sky-500" />}
        />
      </div>
    </div>
  )
}
