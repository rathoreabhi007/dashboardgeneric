import React from 'react';

interface StacksIconProps {
    size?: number;
    color?: string;
    className?: string;
}

const StacksIcon: React.FC<StacksIconProps> = ({
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
            <path d="M480-410 41-645l439-235 440 235-440 235Zm0 165L65-467l63-34 352 188 353-188 63 34-416 222Zm0 165L65-302l63-34 352 188 353-188 63 34L480-80Zm0-399 315-166-315-166-314 166 314 166Zm1-166Z" />
        </svg>
    );
};

export default StacksIcon; 