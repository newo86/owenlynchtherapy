const CSS = `
  @keyframes breathe3     { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
  @keyframes breatheOrange{ 0%, 100% { transform: scale(1); } 50% { transform: scale(1.10); } }
  @keyframes breathe5     { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.07); } }

  @keyframes drift3 { 0%,100%{translate:0px 0px} 25%{translate:5px 6px} 50%{translate:-7px -3px} 75%{translate:4px -6px} }
  @keyframes drift4 { 0%,100%{translate:0px 0px} 25%{translate:-4px -6px} 50%{translate:6px 4px} 75%{translate:-5px 3px} }
  @keyframes drift5 { 0%,100%{translate:0px 0px} 25%{translate:6px 4px} 50%{translate:-3px 6px} 75%{translate:5px -4px} }

  .phc3,.phc4,.phc5 {
    position: absolute; border-radius: 50%; pointer-events: none; will-change: transform; height: 0;
  }
  .phc3 { width:32%; padding-bottom:32%; background:#D4A843; bottom:-18%; right:-3%;
           animation: breathe3 8.5s ease-in-out infinite, drift3 22s ease-in-out infinite; }
  .phc4 { width:18%; padding-bottom:18%; background:#C85A1A; bottom:-5%; left:-2%;
           animation: breatheOrange 8s ease-in-out infinite, drift4 18s ease-in-out infinite; }
  .phc5 { width:28%; padding-bottom:28%; background:#5a9e78; top:-15%; left:-4%; opacity:0.4;
           animation: breathe5 9s ease-in-out infinite, drift5 24s ease-in-out infinite; }

  @media (max-width: 767px) {
    .phc3 { width:50vw; padding-bottom:50vw; top:-10%; right:-15%; bottom:auto; }
    .phc4 { width:30vw; padding-bottom:30vw; top:5%; left:-5%; bottom:auto; }
    .phc5 { display:none; }
  }
`;

export default function PageHeroCircles() {
  return (
    <>
      <style>{CSS}</style>
      <div aria-hidden="true" className="phc3" />
      <div aria-hidden="true" className="phc4" />
      <div aria-hidden="true" className="phc5" />
    </>
  );
}
