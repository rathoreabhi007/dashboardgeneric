import React from 'react';

interface OutputIconProps {
    size?: number;
    color?: string;
    className?: string;
}

const OutputIcon: React.FC<OutputIconProps> = ({
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
            <path d="M180-120q-24 0-42-18t-18-42v-600q0-24 18-42t42-18h600q24 0 42 18t18 42v90h-60v-90H180v600h600v-90h60v90q0 24-18 42t-42 18H180Zm514-174-42-42 113-114H360v-60h405L652-624l42-42 186 186-186 186Z" />
        </svg>
    );
};

export default OutputIcon; 