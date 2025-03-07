"use client";
import { Class } from "@prisma/client";
import { useRouter, useSearchParams } from "next/navigation";

const ClassFilter = ({classId, classes}: {classId: number, classes: {name: string, id: number}[]}) => {
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        // Create a new URLSearchParams object using the current search parameters
        const params = new URLSearchParams(searchParams.toString());
        
        if (e.target.value) {
            params.set('classId', e.target.value);
        } else {
            params.delete('classId');
        }
        
        params.delete('page'); // Reset to first page
        
        // Use router.push to navigate without full page reload
        router.push(`?${params.toString()}`);
    };

    return (
        <div className="relative">
            <select 
                className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-lamaYellow"
                onChange={handleChange}
                defaultValue={classId || ""}
            >
                <option value="">Toutes les classes</option>
                {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
            </select>
        </div>
    );
};

export default ClassFilter;