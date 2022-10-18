import type { DOMAttributes, CSSProperties } from 'react';
type IconProps = {
  style?: CSSProperties;
} & DOMAttributes<SVGElement>;
export const LogoIcon = ({ style = {}, ...props }: IconProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="currentColor"
      style={style}
      {...props}
    >
      <path
        fillRule="evenodd"
        d="M10.552 2 4 21h3.838l4.168-13.14L16.176 21H20L13.447 2h-2.895Z"
        clipRule="evenodd"
      />
    </svg>
  );
};

export const MoreIcon = ({ style = {}, ...props }: IconProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="currentColor"
    >
      <circle cx="12" cy="5.5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="18.5" r="1.5" />
    </svg>
  );
};
export const ExportIcon = ({ style = {}, ...props }: IconProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 3.19995C12.2121 3.19995 12.4156 3.28424 12.5656 3.43427L16.5656 7.43427L15.4343 8.56564L12.8 5.93132V14H11.2V5.93132L8.56564 8.56564L7.43427 7.43427L11.4343 3.43427C11.5843 3.28424 11.7878 3.19995 12 3.19995ZM3.79995 12V16.7992C3.79995 17.3724 3.80057 17.7543 3.82454 18.0476C3.84775 18.3317 3.88879 18.4616 3.93074 18.544C4.04579 18.7698 4.22937 18.9533 4.45516 19.0684C4.5375 19.1103 4.66747 19.1514 4.9515 19.1746C5.24487 19.1985 5.6267 19.1992 6.19995 19.1992H17.8C18.3732 19.1992 18.755 19.1985 19.0484 19.1746C19.3324 19.1514 19.4624 19.1103 19.5447 19.0684C19.7705 18.9533 19.9541 18.7698 20.0692 18.544C20.1111 18.4616 20.1522 18.3317 20.1754 18.0476C20.1993 17.7543 20.2 17.3724 20.2 16.7992V12H21.8V16.8314C21.8 17.364 21.8 17.8116 21.77 18.1779C21.7388 18.5609 21.6708 18.9249 21.4948 19.2703C21.2263 19.7972 20.798 20.2255 20.2711 20.494C19.9256 20.67 19.5617 20.738 19.1787 20.7693C18.8124 20.7992 18.3648 20.7992 17.8322 20.7992H6.16775C5.63509 20.7992 5.18749 20.7992 4.82121 20.7693C4.43823 20.738 4.07426 20.67 3.72878 20.494C3.20193 20.2255 2.77358 19.7972 2.50513 19.2703C2.3291 18.9249 2.26115 18.5609 2.22986 18.1779C2.19993 17.8116 2.19994 17.364 2.19995 16.8313L2.19995 12H3.79995Z"
      />
    </svg>
  );
};
