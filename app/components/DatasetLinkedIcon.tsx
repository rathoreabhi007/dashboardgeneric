import React from 'react';

interface DatasetLinkedIconProps {
    size?: number;
    color?: string;
    className?: string;
}

const DatasetLinkedIcon: React.FC<DatasetLinkedIconProps> = ({
    size = 20,
    color = 'currentColor',
    className = ''
}) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            height={size}
            viewBox="0 -960 960 960"
            width={size}
            fill={color}
            className={className}
        >
            <path d="M180-160q-24 0-42-18t-18-42v-600q0-24 18-42t42-18h600q24 0 42 18t18 42v302q-8-1-14.65-1.5T811-520h-31v-300H180v600h137q5 16 10.5 31t13.5 29H180Zm0-120v60-600 540Zm110-50h30q11-37 36-74t57-66H290v140Zm0-240h140v-140H290v140Zm270 450q-66 0-113-47t-47-113q0-66 47-113t113-47h70v60h-70q-42 0-71 29t-29 71q0 42 29 71t71 29h81v60h-81Zm-30-450h140v-140H530v140Zm30 320v-60h240v60H560Zm160 130v-60h80q42 0 71-29t29-71q0-42-29-71t-71-29h-70v-60h70q66 0 113 46.5T960-280q0 66-47 113t-113 47h-80Z" />
        </svg>
    );
};

export default DatasetLinkedIcon; 