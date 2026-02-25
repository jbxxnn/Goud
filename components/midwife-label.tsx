'use client';

import { useQuery } from '@tanstack/react-query';

interface MidwifeLabelProps {
  id: string;
}

export const MidwifeLabel = ({ id }: MidwifeLabelProps) => {
  const { data: midwivesData } = useQuery({
    queryKey: ['midwives'],
    queryFn: async () => {
      const resp = await fetch('/api/midwives');
      return resp.json();
    }
  });
  
  const midwives = midwivesData?.data || [];
  const midwife = midwives.find((m: any) => m.id === id);
  
  if (!midwife) return <span>{id}</span>;
  return <span>{midwife.practice_name || `${midwife.first_name} ${midwife.last_name}`}</span>;
};
