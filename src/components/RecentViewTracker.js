import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { saveRecentView } from "../utils/recentViews";

function RecentViewTracker() {
  const location = useLocation();

  useEffect(() => {
    saveRecentView(location.pathname);
  }, [location.pathname]);

  return null;
}

export default RecentViewTracker;
