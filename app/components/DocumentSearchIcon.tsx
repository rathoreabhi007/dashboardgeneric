import React from 'react';

interface DocumentSearchIconProps {
    size?: number;
    color?: string;
    className?: string;
}

const DocumentSearchIcon: React.FC<DocumentSearchIconProps> = ({
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
            <path d="M180-820v293-3 390-680 186-186Zm0 740q-24 0-42-18t-18-42v-680q0-24 18-42t42-18h361l219 219v154q-14-7-29-12t-31-8v-107H511v-186H180v680h315q20 21 44.5 36T593-80H180Zm480-110q47 0 78.5-31.5T770-300q0-47-31.5-78.5T660-410q-47 0-78.5 31.5T550-300q0 47 31.5 78.5T660-190ZM864-54 756.84-161Q736-147 711.5-138.5 687-130 660-130q-70.83 0-120.42-49.62Q490-229.24 490-300.12t49.62-120.38q49.62-49.5 120.5-49.5t120.38 49.58Q830-370.83 830-300q0 27-8.5 51.5T799-203.16L906-96l-42 42Z" />
        </svg>
    );
};

export default DocumentSearchIcon; 