import React from 'react';

interface UserAttributesIconProps {
    size?: number;
    color?: string;
    className?: string;
}

const UserAttributesIcon: React.FC<UserAttributesIconProps> = ({
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
            className={className}
            style={{ color }}
        >
            <path
                d="M576-696v-72h288v72H576Zm0 156v-72h288v72H576Zm0 156v-72h288v72H576Zm-240-48q-50 0-85-35t-35-85q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35ZM96-192v-63q0-28 14.5-51t38.5-35q43-21 90-32t97-11q50 0 97 11t90 32q24 12 38.5 35t14.5 51v63H96Zm73-72h334q-30-23-72-35.5T336-312q-53 0-95 12.5T169-264Zm167-240q20.4 0 34.2-13.8Q384-531.6 384-552q0-20.4-13.8-34.2Q356.4-600 336-600q-20.4 0-34.2 13.8Q288-572.4 288-552q0 20.4 13.8 34.2Q315.6-504 336-504Zm0-48Zm0 288Z"
                fill="currentColor"
            />
        </svg>
    );
};

export default UserAttributesIcon; 