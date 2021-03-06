#!/bin/bash
# /etc/init.d/exhibitor
# centos-compatible exhibitor startup script.
### BEGIN INIT INFO
# Provides:          exhibitor
# Required-Start:    $syslog $network
# Required-Stop:     $syslog $network
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: Start exhibitor.
# Description:       Controls exhibitor (ZooKeeper).
### END INIT INFO

# Source function library.
. /etc/init.d/functions

# Source java functions.
if [ -r /usr/share/java-utils/java-functions ]; then
  . /usr/share/java-utils/java-functions
else
  echo "Can't read Java functions library, aborting"
  exit 1
fi

# Source exhibitor configuration.
[ -f /etc/exhibitor/exhibitor.conf ] &&  . /etc/exhibitor/exhibitor.conf

set_jvm

JAVA_CMD=java

# CLASSPATH munging
CLASSPATH="${CLASSPATH}:$(build-classpath-directory ${EXHIBITOR_HOME}/lib 2>/dev/null)"

PARAMS="-cp $CLASSPATH $EXHIBITOR_OPTS com.netflix.exhibitor.application.ExhibitorMain $EXHIBITOR_ARGS"

case "$1" in
    start)
        echo -n "Starting Exhibitor ..."
        
        if [ ! -f $EXHIBITOR_LOG_FILE ]; then 
            mkdir $(dirname $EXHIBITOR_LOG_FILE) > /dev/null 2>&1
            chown $EXHIBITOR_USER:$EXHIBITOR_USER $(dirname $EXHIBITOR_LOG_FILE) > /dev/null 2>&1
        fi
        
        # retrieving pid of the parent process
        /bin/su -l "$EXHIBITOR_USER" --shel=/bin/bash -c "$JAVA_CMD $PARAMS > $EXHIBITOR_LOG_FILE 2>&1 &"
        echo $(jps | grep ExhibitorMain | awk '{print $1}') > "$EXHIBITOR_PID"
        if [ $? == "0" ]; then
            success 
        else
            failure
        fi
        echo
        ;;
    status)
        status -p "$EXHIBITOR_PID" exhibitor 
        ;;
    stop)
        echo -n "Killing Exhibitor ..."
        killproc -p "$EXHIBITOR_PID" exhibitor
        echo
        ;;
    restart)
        $0 stop
        $0 start
        ;;
    *)
        echo "Usage: $0 {start|stop|status|restart}"
        exit 1
esac
