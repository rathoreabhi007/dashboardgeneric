import React from 'react';

interface TableEditIconProps {
    size?: number;
    color?: string;
    className?: string;
}

const TableEditIcon: React.FC<TableEditIconProps> = ({
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
            <path d="M180-430h270v-190H180v190Zm0-250h600v-100H180v100Zm0 560q-24 0-42-18t-18-42v-600q0-24 18-42t42-18h600q24 0 42 18t18 42v279q-14-8-29-12t-31-3q-21 1-41 8.5T702-483l-53 53-199 197.62V-120H180Zm0-60h270v-190H180v190Zm330-250h139l53-53q17-17 37-24.5t41-8.5v-104H510v190Zm10 350v-123l221-220q9-9 20-13t22-4q12 0 23 4.5t20 13.5l37 37q9 9 13 20t4 22q0 11-4.5 22.5T862.09-300L643-80H520Zm300-263-37-37 37 37ZM580-140h38l121-122-37-37-122 121v38Zm141-141-19-18 37 37-18-19Z" />
        </svg>
    );
};

export default TableEditIcon; 