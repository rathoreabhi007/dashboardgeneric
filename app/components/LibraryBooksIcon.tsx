import React from 'react';

interface LibraryBooksIconProps {
    size?: number;
    color?: string;
    className?: string;
}

const LibraryBooksIcon: React.FC<LibraryBooksIconProps> = ({
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
            <path d="M343-420h225v-60H343v60Zm0-90h395v-60H343v60Zm0-90h395v-60H343v60Zm-83 400q-24 0-42-18t-18-42v-560q0-24 18-42t42-18h560q24 0 42 18t18 42v560q0 24-18 42t-42 18H260Zm0-60h560v-560H260v560ZM140-80q-24 0-42-18t-18-42v-620h60v620h620v60H140Zm120-740v560-560Z" />
        </svg>
    );
};

export default LibraryBooksIcon; 