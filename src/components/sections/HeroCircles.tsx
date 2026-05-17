const CSS = `
  @keyframes breathe1     { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.07); } }
  @keyframes breathe2     { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }
  @keyframes breathe3     { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
  @keyframes breatheOrange{ 0%, 100% { transform: scale(1); } 50% { transform: scale(1.10); } }
  @keyframes breathe5     { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.07); } }

  @keyframes drift1 { 0%,100%{translate:0px 0px} 25%{translate:8px -5px} 50%{translate:-4px -8px} 75%{translate:6px 3px} }
  @keyframes drift2 { 0%,100%{translate:0px 0px} 25%{translate:-6px 4px} 50%{translate:5px 7px} 75%{translate:-3px -5px} }
  @keyframes drift3 { 0%,100%{translate:0px 0px} 25%{translate:5px 6px} 50%{translate:-7px -3px} 75%{translate:4px -6px} }
  @keyframes drift4 { 0%,100%{translate:0px 0px} 25%{translate:-4px -6px} 50%{translate:6px 4px} 75%{translate:-5px 3px} }
  @keyframes drift5 { 0%,100%{translate:0px 0px} 25%{translate:6px 4px} 50%{translate:-3px 6px} 75%{translate:5px -4px} }

  .hc1,.hc2,.hc3,.hc4,.hc5 {
    position: absolute; border-radius: 50%; pointer-events: none; will-change: transform; height: 0;
  }
  .hc1 { width:50%; padding-bottom:50%; background:#3d7254; bottom:-30%; left:-5%;
          animation: breathe1 8s ease-in-out infinite, drift1 20s ease-in-out infinite; }
  .hc2 { width:55%; padding-bottom:55%; background:#2d5a42; bottom:-35%; left:25%;
          animation: breathe2 7.5s ease-in-out infinite, drift2 25s ease-in-out infinite; }
  .hc3 { width:32%; padding-bottom:32%; background:#D4A843; bottom:-18%; right:-3%;
          animation: breathe3 8.5s ease-in-out infinite, drift3 22s ease-in-out infinite; }
  .hc4 { width:18%; padding-bottom:18%; background:#C85A1A; bottom:-5%; left:-2%;
          animation: breatheOrange 8s ease-in-out infinite, drift4 18s ease-in-out infinite; }
  .hc5 { width:28%; padding-bottom:28%; background:#5a9e78; top:-15%; left:-4%; opacity:0.4;
          animation: breathe5 9s ease-in-out infinite, drift5 24s ease-in-out infinite; }

  @media (max-width: 767px) {
    .hc1 { width:60vw; padding-bottom:60vw; bottom:-35%; left:-20%; }
    .hc2 { width:65vw; padding-bottom:65vw; bottom:-40%; left:15%; }
    .hc3 { width:50vw; padding-bottom:50vw; top:-10%; right:-15%; bottom:auto; }
    .hc4 { width:30vw; padding-bottom:30vw; top:5%; left:-5%; bottom:auto; }
    .hc5 { width:45vw; padding-bottom:45vw; bottom:-10%; left:40%; top:auto; opacity:0.3; }
  }
`;

export default function HeroCircles() {
  return (
    <>
      <style>{CSS}</style>
      <div aria-hidden="true" className="hc1" />
      <div aria-hidden="true" className="hc2" />
      <div aria-hidden="true" className="hc3" />
      <div aria-hidden="true" className="hc4" />
      <div aria-hidden="true" className="hc5" />
    </>
  );
}
