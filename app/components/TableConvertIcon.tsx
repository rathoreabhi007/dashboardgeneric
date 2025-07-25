import React from 'react';

interface TableConvertIconProps {
    size?: number;
    color?: string;
    className?: string;
}

const TableConvertIcon: React.FC<TableConvertIconProps> = ({
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
            <path d="M440-120v-500H120v-160q0-24 18-42t42-18h600q24 0 42 18t18 42v600q0 24-18 42t-42 18H440Zm60-60h280v-190H500v190Zm0-250h280v-190H500v190ZM180-680h600v-100H180v100ZM120-80v-60h94q-45-23-72-65.5T115-301q0-75 52.58-127T295-480v60q-50 0-85 34.91T175-300q0 46 30 80t75 39v-119h60v220H120Z" />
        </svg>
    );
};

export default TableConvertIcon; 